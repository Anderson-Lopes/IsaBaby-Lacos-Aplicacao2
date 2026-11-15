import { useState } from 'react';
import { CalendarCheck, CheckCircle2, ClipboardList, Clock } from 'lucide-react';
import type { CartItem, Order } from '@/types';
import { OrderCard } from '@/components/orders/OrderCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { AppButton } from '@/components/ui/AppButton';
import { FormField } from '@/components/ui/FormField';
import { PICKUP_SLOTS, UNAVAILABLE_SLOTS } from '@/lib/constants';

interface OrdersScreenProps {
  orders: Order[];
  pendingCount: number;
  onSchedule: (date: string, time: string) => void;
  lastScheduled: { date: string; time: string } | null;
}

function todayISO(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export function OrdersScreen({ orders, pendingCount, onSchedule, lastScheduled }: OrdersScreenProps) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [error, setError] = useState<string | null>(null);

  const today = todayISO();

  const handleSchedule = () => {
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
    onSchedule(date, time);
    setDate('');
    setTime('');
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
          <p className="text-xs text-muted">Acompanhe suas encomendas e retiradas.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-surface border border-border p-4 text-center">
          <p className="text-2xl font-semibold text-ink" aria-hidden="true">
            {orders.length}
          </p>
          <p className="text-xs text-muted mt-1">Total de pedidos</p>
        </div>
        <div className="rounded-2xl bg-surface border border-border p-4 text-center">
          <p className="text-2xl font-semibold text-accent" aria-hidden="true">
            {pendingCount}
          </p>
          <p className="text-xs text-muted mt-1">Pedidos pendentes</p>
        </div>
      </div>

      <div className="rounded-2xl bg-surface border border-border p-4 sm:p-5 shadow-soft">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-primary">
          <CalendarCheck className="w-4 h-4 text-secondary" aria-hidden="true" />
          Agendar retirada
        </h3>
        <p className="text-xs text-muted mt-1 mb-4">
          Escolha data e horário disponíveis para retirar sua encomenda.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            label="Data"
            name="pickup-date"
            type="date"
            min={today}
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setError(null);
            }}
          />
          <FormField
            kind="select"
            label="Horário"
            name="pickup-time"
            value={time}
            onChange={(e) => {
              setTime(e.target.value);
              setError(null);
            }}
            options={[
              { value: '', label: 'Selecione um horário' },
              ...PICKUP_SLOTS.map((slot) => ({
                value: slot,
                label: UNAVAILABLE_SLOTS.includes(slot) ? `${slot} — indisponível` : slot,
              })).filter((option) => !UNAVAILABLE_SLOTS.includes(option.value as (typeof PICKUP_SLOTS)[number])),
            ]}
          />
        </div>
        {error && (
          <p className="mt-3 text-xs text-primary" role="alert">
            {error}
          </p>
        )}
        {lastScheduled && !error && (
          <div
            role="status"
            className="mt-3 flex items-center gap-2 rounded-xl border border-ink/40 bg-ink/10 px-4 py-3 text-sm text-ink"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>
              Agendamento solicitado para{' '}
              <strong className="font-semibold">
                {lastScheduled.date.split('-').reverse().join('/')} às {lastScheduled.time}
              </strong>
              . Você receberá uma confirmação em breve.
            </span>
          </div>
        )}
        <div className="mt-4">
          <AppButton icon={Clock} block onClick={handleSchedule}>
            Solicitar agendamento
          </AppButton>
        </div>
      </div>

      {orders.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Nenhum pedido por aqui"
          message="Personalize um laço no catálogo e adicione ao pedido para acompanhá-lo aqui."
        />
      ) : (
        <ul className="space-y-3.5">
          {orders.map((order) => (
            <li key={order.id}>
              <OrderCard order={order} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
