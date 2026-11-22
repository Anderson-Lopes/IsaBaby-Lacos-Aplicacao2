import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Order, Product, ProductDraft } from '@/types';
import { PRODUCT_STATUS_LABELS, ORDER_STATUS_LABELS, PICKUP_SLOTS, UNAVAILABLE_SLOTS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';

interface ProductOptionRow {
  id: string;
  option_name: string;
  option_values: string[];
}

interface ProductRow {
  id: string;
  name: string;
  model: string;
  description: string;
  price: number;
  quantity: number;
  status: Product['status'];
  image_url: string | null;
  image_urls: string[];
  category: string | null;
  created_at: string;
  product_options: ProductOptionRow[];
}

interface OrderItemRow {
  product_id: string | null;
  product_name: string;
  color: string;
  size: string;
  quantity: number;
  unit_price: number;
  notes: string | null;
  customizations: Record<string, string>;
}

interface OrderRow {
  id: string;
  number: number;
  total: number;
  status: Order['status'];
  pickup_date: string | null;
  created_at: string;
  client_name: string | null;
  notes: string | null;
  payment_status: Order['paymentStatus'];
  order_items: OrderItemRow[];
}

const mapProduct = (row: ProductRow): Product => ({
  id: row.id,
  name: row.name,
  model: row.model,
  description: row.description,
  price: Number(row.price),
  quantity: row.quantity,
  status: row.status,
  imageUrl: row.image_url ?? undefined,
  imageUrls: row.image_urls?.length ? row.image_urls : row.image_url ? [row.image_url] : [],
  category: row.category,
  createdAt: row.created_at,
  options: (row.product_options ?? []).map((option) => ({
    id: option.id,
    name: option.option_name,
    values: Array.isArray(option.option_values) ? option.option_values : [],
  })),
});

const mapOrder = (row: OrderRow): Order => ({
  id: row.id,
  number: String(row.number).padStart(4, '0'),
  total: Number(row.total),
  status: row.status,
  paymentStatus: row.payment_status,
  customerName: row.client_name ?? undefined,
  notes: row.notes ?? undefined,
  pickupDate: row.pickup_date ?? undefined,
  createdAt: row.created_at,
  items: row.order_items.map((item) => ({
    productId: item.product_id ?? '',
    productName: item.product_name,
    color: item.color,
    size: item.size,
    customizations: Object.keys(item.customizations ?? {}).length
      ? item.customizations
      : Object.fromEntries([['Cor', item.color], ['Tamanho', item.size]].filter(([, value]) => value)),
    quantity: item.quantity,
    unitPrice: Number(item.unit_price),
    total: Number(item.unit_price) * item.quantity,
    notes: item.notes ?? undefined,
  })),
});

export function useShopData(isAdmin: boolean) {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!supabase) {
        setError('Supabase não está configurado.');
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const { data: productRows, error: productError } = await supabase
          .from('products')
          .select('*, product_options(*)')
          .order('created_at', { ascending: false });
        if (productError) throw new Error(productError.message);

        const mappedProducts = (productRows as ProductRow[]).map(mapProduct);
        let mappedOrders: Order[] = [];
        if (isAdmin) {
          const { data: orderRows, error: orderError } = await supabase
            .from('orders')
            .select('*, order_items(*)')
            .order('created_at', { ascending: false });
          if (orderError) throw new Error(orderError.message);
          mappedOrders = (orderRows as OrderRow[]).map(mapOrder);
        }

        if (!active) return;
        setProducts(mappedProducts);
        setOrders(mappedOrders);
        setError(null);
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar o catálogo.');
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [isAdmin]);

  const saveProduct = async (data: ProductDraft, productId?: string): Promise<Product> => {
    if (!isAdmin) throw new Error('Somente a administração pode gerenciar produtos.');
    if (!supabase) throw new Error('Supabase não está configurado.');

    const { data: row, error: saveError } = await supabase.rpc('save_product_with_gallery', {
      p_product_id: productId ?? null,
      p_name: data.name.trim(),
      p_model: data.model.trim(),
      p_description: data.description.trim(),
      p_price: data.price,
      p_quantity: data.quantity,
      p_status: data.status,
      p_image_urls: data.imageUrls,
      p_category: data.category?.trim() || null,
      p_options: data.options.map((option) => ({
        name: option.name.trim(),
        values: option.values.map((value) => value.trim()).filter(Boolean),
      })),
    }).single();
    if (saveError) throw new Error(saveError.message);

    const product = mapProduct({
      ...(row as Omit<ProductRow, 'product_options'>),
      product_options: [],
    });
    const savedProduct = { ...product, options: data.options };
    setProducts((current) => productId
      ? current.map((item) => item.id === productId ? savedProduct : item)
      : [savedProduct, ...current]);
    return savedProduct;
  };

  const deleteProduct = async (product: Product): Promise<void> => {
    if (!isAdmin) throw new Error('Somente a administração pode excluir produtos.');
    if (!supabase) throw new Error('Supabase não está configurado.');

    const { error: deleteError } = await supabase.from('products').delete().eq('id', product.id);
    if (deleteError) throw new Error(deleteError.message);
    setProducts((current) => current.filter((item) => item.id !== product.id));
  };

  const updateOrderStatus = async (orderId: string, status: Order['status']): Promise<void> => {
    if (!isAdmin) throw new Error('Somente a administração pode alterar o status dos pedidos.');
    if (!supabase) throw new Error('Supabase não está configurado.');

    const { error: updateError } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId)
      .select('id')
      .single();

    if (updateError) throw new Error(updateError.message);
    setOrders((current) => current.map((order) => order.id === orderId ? { ...order, status } : order));
  };

  const confirmOrderPaid = async (orderId: string): Promise<void> => {
    if (!isAdmin) throw new Error('Somente a administração pode confirmar pagamentos.');
    if (!supabase) throw new Error('Supabase não está configurado.');
    const { error: paymentError } = await supabase.rpc('confirm_order_paid', { p_order_id: orderId });
    if (paymentError) throw new Error(paymentError.message);
    setOrders((current) => current.map((order) => order.id === orderId ? { ...order, paymentStatus: 'pago' } : order));
  };

  const refreshOrders = useCallback(async (): Promise<void> => {
    if (!isAdmin) throw new Error('Somente a administração pode consultar pedidos.');
    if (!supabase) throw new Error('Supabase não está configurado.');
    const { data, error: refreshError } = await supabase.from('orders')
      .select('*, order_items(*)').order('created_at', { ascending: false });
    if (refreshError) throw new Error(refreshError.message);
    setOrders((data as OrderRow[]).map(mapOrder));
  }, [isAdmin]);

  const counts = useMemo(
    () => ({
      products: products.length,
      orders: orders.length,
      pending: orders.filter((order) => order.status === 'pendente').length,
    }),
    [products, orders]
  );

  return {
    products,
    orders,
    counts,
    loading,
    error,
    saveProduct,
    deleteProduct,
    updateOrderStatus,
    confirmOrderPaid,
    refreshOrders,
    productStatusLabels: PRODUCT_STATUS_LABELS,
    orderStatusLabels: ORDER_STATUS_LABELS,
    pickupSlots: PICKUP_SLOTS,
    unavailableSlots: UNAVAILABLE_SLOTS,
  };
}
