import type { OrderStatus, ProductStatus } from '@/types';

export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  ativo: 'Ativo',
  sob_encomenda: 'Sob encomenda',
  indisponivel: 'Indisponível',
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pendente: 'Pendente',
  confirmado: 'Confirmado',
  em_producao: 'Em produção',
  pronto_retirada: 'Pronto para retirada',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
};

export const CATEGORIES = ['Clássicos', 'Premium', 'Delicados', 'Brilhantes'] as const;

export const WHATSAPP_NUMBER = '5549999999999';

export function formatPrice(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
}

export function buildWhatsAppUrl(
  phone: string,
  customerName: string,
  items: { productName: string; quantity: number; unitPrice: number; total: number; selections: { optionName: string; value: string }[]; notes?: string }[],
  total: number,
  notes?: string,
): string {
  const lines: string[] = [];
  lines.push(`*Novo Pedido — IsaBaby Laços*`);
  lines.push('');
  lines.push(`*Cliente:* ${customerName}`);
  lines.push('');
  lines.push('*Itens:*');
  for (const item of items) {
    lines.push(`• ${item.productName}`);
    for (const sel of item.selections) {
      lines.push(`   - ${sel.optionName}: ${sel.value}`);
    }
    if (item.notes) lines.push(`   - Obs: ${item.notes}`);
    lines.push(`   - Qtd: ${item.quantity} × ${formatPrice(item.unitPrice)} = ${formatPrice(item.total)}`);
  }
  lines.push('');
  lines.push(`*Total: ${formatPrice(total)}*`);
  if (notes) {
    lines.push('');
    lines.push(`*Observações:* ${notes}`);
  }
  lines.push('');
  lines.push('_Pedido gerado pelo site IsaBaby Laços_');

  const message = lines.join('\n');
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
