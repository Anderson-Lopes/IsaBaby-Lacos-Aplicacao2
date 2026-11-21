import { useCallback, useEffect, useState } from 'react';
import type { CartItem } from '@/types';

const CART_KEY = 'isababy.cart.v2';

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

function persist(items: CartItem[]): void {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>(() => loadCart());

  useEffect(() => {
    persist(items);
  }, [items]);

  const addItem = useCallback((item: Omit<CartItem, 'id'>) => {
    setItems((prev) => {
      const existing = prev.find(
        (existing) =>
          existing.productId === item.productId &&
          existing.unitPrice === item.unitPrice &&
          existing.notes === item.notes &&
          existing.selections.length === item.selections.length &&
          existing.selections.every((sel, i) =>
            sel.optionName === item.selections[i]?.optionName && sel.value === item.selections[i]?.value,
          ),
      );
      if (existing) {
        return prev.map((existingItem) =>
          existingItem.id === existing.id
            ? { ...existingItem, quantity: existingItem.quantity + item.quantity, total: (existingItem.quantity + item.quantity) * existingItem.unitPrice }
            : existingItem,
        );
      }
      return [...prev, { ...item, id: `cart-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` }];
    });
  }, []);

  const setQuantity = useCallback((itemId: string, quantity: number) => {
    if (quantity < 1) return;
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, quantity, total: quantity * item.unitPrice }
          : item,
      ),
    );
  }, []);

  const removeItem = useCallback((itemId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  }, []);

  const clear = useCallback(() => {
    setItems([]);
  }, []);

  const total = items.reduce((sum, item) => sum + item.total, 0);
  const count = items.reduce((sum, item) => sum + item.quantity, 0);

  return { items, addItem, setQuantity, removeItem, clear, total, count };
}
