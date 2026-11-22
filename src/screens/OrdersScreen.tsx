import { ClipboardList } from 'lucide-react';
import type { Order, OrderStatus } from '@/types';
import { OrderCard } from '@/components/orders/OrderCard';
import { EmptyState } from '@/components/ui/EmptyState';

interface OrdersScreenProps {
  orders: Order[];
  pendingCount: number;
  onStatusChange: (orderId: string, status: OrderStatus) => void;
}

export function OrdersScreen({ orders, pendingCount, onStatusChange }: OrdersScreenProps) {
  return (
    <section aria-labelledby="orders-title" className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 shrink-0 rounded-2xl bg-surface border border-border flex items-center justify-center">
          <ClipboardList className="w-5 h-5 text-primary" aria-hidden="true" />
        </div>
        <div>
          <h2 id="orders-title" className="font-display text-xl font-semibold text-primary leading-tight">Pedidos recebidos</h2>
          <p className="text-xs text-muted">Pedidos registrados no sistema.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-surface border border-border p-4 text-center">
          <p className="text-2xl font-semibold text-ink" aria-hidden="true">{orders.length}</p>
          <p className="text-xs text-muted mt-1">Total de pedidos</p>
        </div>
        <div className="rounded-2xl bg-surface border border-border p-4 text-center">
          <p className="text-2xl font-semibold text-accent" aria-hidden="true">{pendingCount}</p>
          <p className="text-xs text-muted mt-1">Pedidos pendentes</p>
        </div>
      </div>

      {orders.length === 0 ? (
        <EmptyState icon={ClipboardList} title="Nenhum pedido registrado"
          message="Pedidos finalizados pelo WhatsApp não são gravados neste histórico." />
      ) : (
        <ul className="space-y-3.5">
          {orders.map((order) => (
            <li key={order.id}>
              <OrderCard order={order} isAdmin onStatusChange={onStatusChange} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
