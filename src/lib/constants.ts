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

export const COLOR_OPTIONS = [
  { id: 'rosa', label: 'Rosa', hex: '#FFC0CB' },
  { id: 'lilas', label: 'Lilás', hex: '#C8A2C8' },
  { id: 'amarelo', label: 'Amarelo', hex: '#FFFF00' },
  { id: 'verde', label: 'Verde', hex: '#93E9BE' },
] as const;

export const SIZE_OPTIONS = ['Pequeno', 'Médio', 'Grande'] as const;

export const PICKUP_SLOTS = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '18:00'] as const;

export const UNAVAILABLE_SLOTS = ['11:00', '15:00'];

export const SELLER_WHATSAPP = import.meta.env.VITE_SELLER_WHATSAPP?.replace(/\D/g, '') ?? '';

export function formatPrice(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
}
