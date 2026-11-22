import { useCallback, useEffect, useRef, useState } from 'react';
import type { CartItem } from '@/types';
import { supabase } from '@/lib/supabase';
import { getGuestOrderStatus } from '@/lib/guestOrders';

const CART_KEY = 'isababy.cart.v1';

function isCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<CartItem>;
  const pending = item.pendingOrder;
  return typeof item.productId === 'string'
    && typeof item.productName === 'string'
    && Number.isInteger(item.quantity) && (item.quantity ?? 0) > 0
    && typeof item.unitPrice === 'number' && Number.isFinite(item.unitPrice)
    && typeof item.total === 'number' && Number.isFinite(item.total)
    && typeof item.customizations === 'object' && item.customizations !== null
    && (!pending || (
      typeof pending.token === 'string' && /^[0-9a-f]{64}$/.test(pending.token)
      && typeof pending.customerName === 'string' && typeof pending.observations === 'string'
      && (pending.number === undefined || Number.isInteger(pending.number))
    ));
}

function readCart(): { items: CartItem[]; error: string | null } {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return { items: [], error: null };
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.every(isCartItem)) {
      throw new Error('Os dados salvos do carrinho são inválidos.');
    }
    return { items: parsed, error: null };
  } catch (error) {
    return { items: [], error: error instanceof Error ? error.message : 'Não foi possível carregar o carrinho.' };
  }
}

export function useCart() {
  const [initial] = useState(readCart);
  const [items, setItemsState] = useState<CartItem[]>(initial.items);
  const [error, setError] = useState<string | null>(initial.error);
  const [syncError, setSyncError] = useState<string | null>(null);
  const itemsRef = useRef(items);
  const errorRef = useRef(error);

  const setItems = useCallback((update: CartItem[] | ((current: CartItem[]) => CartItem[])) => {
    if (errorRef.current) throw new Error(errorRef.current);
    const next = typeof update === 'function' ? update(itemsRef.current) : update;
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(next));
    } catch {
      const message = 'Não foi possível salvar o carrinho neste dispositivo.';
      errorRef.current = message;
      setError(message);
      throw new Error(message);
    }
    itemsRef.current = next;
    setItemsState(next);
  }, []);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== CART_KEY) return;
      const result = readCart();
      errorRef.current = result.error;
      setError(result.error);
      if (!result.error) {
        itemsRef.current = result.items;
        setItemsState(result.items);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    let checking = false;
    const check = async () => {
      if (checking) return;
      const tokens = [...new Set(itemsRef.current.flatMap((item) => item.pendingOrder ? [item.pendingOrder.token] : []))];
      if (tokens.length === 0) {
        setSyncError(null);
        return;
      }
      checking = true;
      try {
        const results = await Promise.all(tokens.map(async (token) => {
          return { token, status: await getGuestOrderStatus(token) };
        }));
        if (!active) return;
        const paid = new Set(results.filter(({ status }) => status?.payment_status === 'pago').map(({ token }) => token));
        const cancelled = new Set(results.filter(({ status }) => status?.status === 'cancelado').map(({ token }) => token));
        if (paid.size || cancelled.size) {
          setItems((current) => current
            .filter((item) => !item.pendingOrder || !paid.has(item.pendingOrder.token))
            .map((item) => item.pendingOrder && cancelled.has(item.pendingOrder.token)
              ? { ...item, pendingOrder: undefined }
              : item));
        }
        setSyncError(null);
      } catch (cause) {
        if (active) setSyncError(cause instanceof Error ? cause.message : 'Não foi possível verificar os pagamentos.');
      } finally {
        checking = false;
      }
    };
    void check();
    const interval = window.setInterval(() => void check(), 15000);
    window.addEventListener('focus', check);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener('focus', check);
    };
  }, [setItems]);

  return { items, setItems, error, syncError };
}
