import type { CartItem } from '@/types';
import { SELLER_WHATSAPP, formatPrice } from '@/lib/constants';

export function createWhatsAppOrderUrl(
  items: CartItem[],
  customerName: string,
  observations: string,
): string {
  if (!/^\d{8,15}$/.test(SELLER_WHATSAPP)) {
    throw new Error('Configure um número válido da vendedora em VITE_SELLER_WHATSAPP antes de aceitar pedidos.');
  }
  if (items.length === 0) throw new Error('O carrinho está vazio.');

  const lines = [
    'Olá! Gostaria de fazer um pedido:',
    '',
    `Cliente: ${customerName}`,
    '',
    ...items.flatMap((item, index) => [
      `${index + 1}. ${item.productName}`,
      ...Object.entries(item.customizations ?? {}).map(([name, value]) => `   ${name}: ${value}`),
      `   Quantidade: ${item.quantity}`,
      `   Valor unitário: ${formatPrice(item.unitPrice)}`,
      `   Subtotal: ${formatPrice(item.total)}`,
      ...(item.notes ? [`   Observação: ${item.notes}`] : []),
      '',
    ]),
    `Total do pedido: ${formatPrice(items.reduce((sum, item) => sum + item.total, 0))}`,
    ...(observations ? ['', `Observações: ${observations}`] : []),
  ];

  return `https://wa.me/${SELLER_WHATSAPP}?text=${encodeURIComponent(lines.join('\n'))}`;
}
