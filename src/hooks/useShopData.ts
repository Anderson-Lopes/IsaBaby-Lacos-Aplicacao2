import { useMemo, useState } from 'react';
import type { Product } from '@/types';
import { PRODUCT_STATUS_LABELS, ORDER_STATUS_LABELS, PICKUP_SLOTS, UNAVAILABLE_SLOTS } from '@/lib/constants';
import { loadProducts, loadOrders, saveProducts, saveOrders } from '@/lib/storage';

function nextOrderNumber(orders: { number: string }[]): string {
  const nums = orders.map((o) => Number(o.number.replace(/\D/g, '')) || 0);
  return String(Math.max(0, ...nums) + 1).padStart(4, '0');
}

export function useShopData() {
  const [products, setProducts] = useState<Product[]>(() => loadProducts());
  const [orders, setOrders] = useState(() => loadOrders());

  const addProduct = (data: Omit<Product, 'id' | 'createdAt'>): Product => {
    const product: Product = {
      ...data,
      id: `p-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    const next = [product, ...products];
    setProducts(next);
    saveProducts(next);
    return product;
  };

  const addOrder = (order: Omit<(typeof orders)[number], 'id' | 'number' | 'createdAt'>) => {
    const created = {
      ...order,
      id: `o-${Date.now()}`,
      number: nextOrderNumber(orders),
      createdAt: new Date().toISOString(),
    };
    const next = [created, ...orders];
    setOrders(next);
    saveOrders(next);
  };

  const counts = useMemo(
    () => ({
      products: products.length,
      orders: orders.length,
      pending: orders.filter((o) => o.status === 'pendente').length,
    }),
    [products, orders]
  );

  return {
    products,
    orders,
    counts,
    addProduct,
    addOrder,
    productStatusLabels: PRODUCT_STATUS_LABELS,
    orderStatusLabels: ORDER_STATUS_LABELS,
    pickupSlots: PICKUP_SLOTS,
    unavailableSlots: UNAVAILABLE_SLOTS,
  };
}
