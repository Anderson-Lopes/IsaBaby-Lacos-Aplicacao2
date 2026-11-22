import { useEffect, useState } from 'react';
import type { CartItem } from '@/types';

const CART_KEY = 'isababy.cart.v1';

function isCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<CartItem>;
  return typeof item.productId === 'string'
    && typeof item.productName === 'string'
    && typeof item.quantity === 'number'
    && Number.isInteger(item.quantity)
    && item.quantity > 0
    && typeof item.unitPrice === 'number'
    && Number.isFinite(item.unitPrice)
    && typeof item.total === 'number'
    && Number.isFinite(item.total)
    && typeof item.customizations === 'object'
    && item.customizations !== null;
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CART_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed) || !parsed.every(isCartItem)) {
          throw new Error('Os dados salvos do carrinho são inválidos. Remova os itens e tente novamente.');
        }
        setItems(parsed);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar o carrinho salvo.');
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!loaded || error) return;
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(items));
    } catch {
      setError('Não foi possível salvar o carrinho neste dispositivo.');
    }
  }, [items, loaded, error]);

  return { items, setItems, error };
}
