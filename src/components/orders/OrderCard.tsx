import type { LucideIcon } from 'lucide-react';
import {
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  CircleDashed,
  Hammer,
  PackageCheck,
  XCircle,
} from 'lucide-react';
import type { CartItem, Order, OrderStatus } from '@/types';
import { ORDER_STATUS_LABELS, formatDate, formatPrice } from '@/lib/constants';
import { StatusBadge } from '@/components/ui/StatusBadge';

const statusStyles: Record<OrderStatus, { className: string; icon: LucideIcon }> = {
  pendente: { className: 'text-accent border-accent/40 bg-accent/10', icon: CircleDashed },
  confirmado: { className: 'text-ink border-ink/40 bg-ink/10', icon: CheckCircle2 },
  em_producao: { className: 'text-secondary border-secondary/40 bg-secondary/10', icon: Hammer },
  pronto_retirada: { className: 'text-primary border-primary/40 bg-primary/10', icon: PackageCheck },
  entregue: { className: 'text-muted border-border bg-surface', icon: BadgeCheck },
  cancelado: { className: 'text-muted border-border bg-surface line-through', icon: XCircle },
};

interface OrderCardProps {
  order: Order;
  isAdmin?: boolean;
  onStatusChange?: (orderId: string, status: OrderStatus) => void;
}

export function OrderCard({ order, isAdmin = false, onStatusChange }: OrderCardProps) {
  const style = statusStyles[order.status];

  return (
    <article className="rounded-2xl bg-surface border border-border p-4 sm:p-5 shadow-soft transition-colors hover:border-secondary/40">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-primary">
            Pedido #{order.number}
          </h3>
          <p className="text-xs text-muted mt-0.5">
            {order.items.reduce((sum, item) => sum + item.quantity, 0)}{' '}
            {order.items.reduce((sum, item) => sum + item.quantity, 0) === 1 ? 'item' : 'itens'}
          </p>
        </div>
        <StatusBadge icon={style.icon} label={ORDER_STATUS_LABELS[order.status]} className={style.className} />
      </header>

      <ul className="mt-3.5 space-y-2.5">
        {order.items.map((item, index) => (
          <OrderItem key={index} item={item} />
        ))}
      </ul>

      <footer className="mt-4 pt-3.5 border-t border-border flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-ink">{formatPrice(order.total)}</span>
        {order.pickupDate && (
          <span className="inline-flex items-center gap-1.5 text-xs text-secondary">
            <CalendarClock className="w-3.5 h-3.5" aria-hidden="true" />
            Retirada: {formatDate(order.pickupDate)}
          </span>
        )}
      </footer>
      {isAdmin && onStatusChange && (
        <div className="mt-3">
          <label htmlFor={`order-status-${order.id}`} className="block text-xs font-medium text-muted mb-1">
            Atualizar status
          </label>
          <select
            id={`order-status-${order.id}`}
            value={order.status}
            onChange={(event) => onStatusChange(order.id, event.target.value as OrderStatus)}
            className="input-field"
          >
            {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      )}
    </article>
  );
}

function OrderItem({ item }: { item: CartItem }) {
  return (
    <li className="flex items-start justify-between gap-3 text-sm">
      <div className="min-w-0">
        <p className="text-ink font-medium truncate">{item.productName}</p>
        <p className="text-xs text-muted mt-0.5">
          {Object.entries(item.customizations ?? {}).map(([name, value]) => `${name}: ${value}`).join(' · ')}
          {Object.keys(item.customizations ?? {}).length > 0 && ' · '}
          {item.quantity} un.
        </p>
        {item.notes && <p className="text-xs text-secondary/80 mt-0.5 italic truncate">&ldquo;{item.notes}&rdquo;</p>}
      </div>
      <span className="text-xs text-muted shrink-0">{formatPrice(item.total)}</span>
    </li>
  );
}
