import { useState } from 'react';
import { CalendarCheck, CheckCircle2, ClipboardList, Clock } from 'lucide-react';
import type { Order } from '@/types';
import { OrderCard } from '@/components/orders/OrderCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { AppButton } from '@/components/ui/AppButton';
import { FormField } from '@/components/ui/FormField';
import { PICKUP_SLOTS, UNAVAILABLE_SLOTS } from '@/lib/constants';

interface OrdersScreenProps {
  orders: Order[];
  pendingCount: number;
  onSchedule: (orderId: string, date: string, time: string) => Promise<void>;
}

function todayISO(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export function OrdersScreen({ orders, pendingCount, onSchedule }: OrdersScreenProps) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [orderId, setOrderId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const today = todayISO();
  const eligibleOrders = orders.filter(
    (order) => ['approved', 'not_required'].includes(order.paymentStatus)
      && !['cancelado', 'entregue'].includes(order.status)
  );
  const selectedOrder = eligibleOrders.find((order) => order.id === orderId)
    ?? eligibleOrders.find((order) => !order.pickupDate)
    ?? eligibleOrders[0];

  const handleSchedule = async () => {
    if (!selectedOrder) {
      setError('É necessário ter um pedido pago antes de solicitar a retirada.');
      return;
    }
    if (!date) {
      setError('Selecione uma data para a retirada.');
      return;
    }
    if (date < today) {
      setError('Não é possível agendar para uma data passada.');
      return;
    }
    if (!time) {
      setError('Selecione um horário disponível.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await onSchedule(selectedOrder.id, date, time);
      setDate('');
      setTime('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível solicitar a retirada.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="orders-title" className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 shrink-0 rounded-2xl bg-surface border border-border flex items-center justify-center">
          <ClipboardList className="w-5 h-5 text-primary" aria-hidden="true" />
        </div>
        <div>
          <h2 id="orders-title" className="font-display text-xl font-semibold text-primary leading-tight">
            Meus pedidos
          </h2>
          <p className="text-xs text-muted">Acompanhe suas encomendas, pagamentos e retiradas.</p>
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

      <div className="rounded-2xl bg-surface border border-border p-4 sm:p-5 shadow-soft">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-primary">
          <CalendarCheck className="w-4 h-4 text-secondary" aria-hidden="true" />
          Agendar retirada
        </h3>
        <p className="text-xs text-muted mt-1 mb-4">
          A retirada pode ser agendada depois da confirmação do pagamento.
        </p>
        {eligibleOrders.length === 0 ? (
          <p className="rounded-xl bg-background p-3 text-xs text-muted">A opção de retirada fica disponível após a confirmação do pagamento.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField
              kind="select"
              label="Pedido"
              name="pickup-order"
              value={selectedOrder?.id ?? ''}
              onChange={(event) => {
                setOrderId(event.target.value);
                setError(null);
              }}
              options={eligibleOrders.map((order) => ({ value: order.id, label: `Pedido #${order.number}` }))}
            />
            <FormField
              label="Data"
              name="pickup-date"
              type="date"
              min={today}
              value={date}
              onChange={(event) => {
                setDate(event.target.value);
                setError(null);
              }}
            />
            <FormField
              kind="select"
              label="Horário"
              name="pickup-time"
              value={time}
              onChange={(event) => {
                setTime(event.target.value);
                setError(null);
              }}
              options={[
                { value: '', label: 'Selecione um horário' },
                ...PICKUP_SLOTS.filter((slot) => !UNAVAILABLE_SLOTS.includes(slot)).map((slot) => ({ value: slot, label: slot })),
              ]}
            />
          </div>
        )}
        {error && <p className="mt-3 text-xs text-primary" role="alert">{error}</p>}
        {selectedOrder?.pickupDate && (
          <div role="status" className="mt-3 flex items-center gap-2 rounded-xl border border-ink/40 bg-ink/10 px-4 py-3 text-sm text-ink">
            <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>
              Retirada agendada para{' '}
              <strong className="font-semibold">
                {selectedOrder.pickupDate.split('-').reverse().join('/')} às {selectedOrder.pickupTime}
              </strong>
              {' '}no pedido #{selectedOrder.number}.
            </span>
          </div>
        )}
        <div className="mt-4">
          <AppButton icon={Clock} block onClick={() => void handleSchedule()} disabled={busy || !eligibleOrders.length}>
            {busy ? 'Salvando...' : 'Solicitar agendamento'}
          </AppButton>
        </div>
      </div>

      {orders.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Nenhum pedido por aqui"
          message="Personalize um laço no catálogo e adicione ao carrinho para acompanhar seu pedido."
        />
      ) : (
        <ul className="space-y-3.5">
          {orders.map((order) => (
            <li key={order.id}><OrderCard order={order} /></li>
          ))}
        </ul>
      )}
    </section>
  );
}
