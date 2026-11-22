import type { CartItem } from '@/types';
import { supabase } from '@/lib/supabase';

export function newOrderToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function registerGuestOrder(
  token: string,
  customerName: string,
  observations: string,
  items: CartItem[],
): Promise<number> {
  if (!supabase) throw new Error('Supabase não está configurado.');
  const { data, error } = await supabase.rpc('create_guest_order', {
    p_token: token,
    p_customer_name: customerName,
    p_notes: observations,
    p_items: items.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      customizations: item.customizations,
      notes: item.notes ?? null,
    })),
  });
  if (error) throw new Error(`Não foi possível registrar o pedido: ${error.message}`);
  if (!data || !Number.isInteger(data.number)) throw new Error('O servidor não retornou o número do pedido.');
  return data.number;
}

export async function getGuestOrderStatus(token: string): Promise<{ payment_status: string; status: string; number: number } | null> {
  if (!supabase) throw new Error('Supabase não está configurado.');
  const { data, error } = await supabase.rpc('guest_order_status', { p_token: token });
  if (error) throw new Error(`Não foi possível consultar o pedido: ${error.message}`);
  return data as { payment_status: string; status: string; number: number } | null;
}
