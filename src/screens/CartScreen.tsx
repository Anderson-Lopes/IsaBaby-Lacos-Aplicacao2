import { useMemo, useState } from 'react';
import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import type { Address, CartLine } from '@/types';
import { formatPrice } from '@/lib/constants';
import { AppButton } from '@/components/ui/AppButton';
import { FormField } from '@/components/ui/FormField';

interface CartScreenProps {
  cart: CartLine[];
  addresses: Address[];
  onSetQuantity: (itemId: string, quantity: number) => Promise<void>;
  onRemove: (itemId: string) => Promise<void>;
  onCheckout: (addressId: string) => Promise<void>;
  onManageAddresses: () => void;
  onBack: () => void;
}

export function CartScreen({ cart, addresses, onSetQuantity, onRemove, onCheckout, onManageAddresses, onBack }: CartScreenProps) {
  const [addressId, setAddressId] = useState(addresses.find((address) => address.isDefault)?.id ?? addresses[0]?.id ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const total = useMemo(() => cart.reduce((sum, item) => sum + item.total, 0), [cart]);

  const checkout = async () => {
    if (!addressId) {
      setError('Cadastre e selecione um endereço de entrega.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await onCheckout(addressId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível iniciar o pagamento.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="cart-title" className="mx-auto max-w-3xl space-y-5">
      <button type="button" onClick={onBack} className="min-h-[44px] text-sm text-secondary hover:text-primary">&larr; Continuar comprando</button>
      <div className="flex items-center gap-3">
        <ShoppingBag className="h-6 w-6 text-primary" aria-hidden="true" />
        <div>
          <h2 id="cart-title" className="font-display text-xl font-semibold text-primary">Carrinho</h2>
          <p className="text-xs text-muted">Os preços e o estoque serão conferidos novamente ao finalizar.</p>
        </div>
      </div>
      {cart.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted">Seu carrinho está vazio.</div>
      ) : (
        <>
          <ul className="space-y-3">
            {cart.map((item) => (
              <li key={item.id} className="flex gap-3 rounded-2xl border border-border bg-surface p-3 sm:p-4">
                {item.imageUrl ? <img src={item.imageUrl} alt="" className="h-20 w-20 rounded-xl object-cover" /> : <div className="h-20 w-20 rounded-xl bg-background" />}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{item.productName}</p>
                  <p className="text-xs text-muted">{item.color} · {item.size} · {formatPrice(item.unitPrice)} cada</p>
                  {item.notes && <p className="text-xs text-muted">{item.notes}</p>}
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button type="button" aria-label="Diminuir quantidade" onClick={() => void onSetQuantity(item.id, Math.max(1, item.quantity - 1)).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Falha ao atualizar quantidade.'))} disabled={item.quantity <= 1} className="min-h-9 min-w-9 rounded-lg border border-border text-primary disabled:opacity-40"><Minus className="mx-auto h-4 w-4" /></button>
                      <span className="min-w-5 text-center text-sm">{item.quantity}</span>
                      <button type="button" aria-label="Aumentar quantidade" onClick={() => void onSetQuantity(item.id, item.quantity + 1).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Falha ao atualizar quantidade.'))} className="min-h-9 min-w-9 rounded-lg border border-border text-primary"><Plus className="mx-auto h-4 w-4" /></button>
                    </div>
                    <div className="flex items-center gap-3">
                      <strong className="text-sm text-ink">{formatPrice(item.total)}</strong>
                      <button type="button" aria-label={`Remover ${item.productName}`} onClick={() => void onRemove(item.id).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Falha ao remover item.'))} className="min-h-9 min-w-9 rounded-lg text-primary hover:bg-background"><Trash2 className="mx-auto h-4 w-4" /></button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="space-y-4 rounded-2xl border border-border bg-surface p-4 sm:p-5">
            <div className="flex justify-between text-base font-semibold text-primary">
              <span>Total do pedido</span><span>{formatPrice(total)}</span>
            </div>
            {addresses.length ? (
              <FormField
                kind="select"
                label="Endereço de entrega"
                name="checkout-address"
                value={addressId}
                onChange={(event) => setAddressId(event.target.value)}
                options={addresses.map((address) => ({
                  value: address.id,
                  label: `${address.recipientName} — ${address.street}, ${address.number}, ${address.city}/${address.state}${address.isDefault ? ' (principal)' : ''}`,
                }))}
              />
            ) : (
              <p className="text-sm text-muted">Cadastre um endereço antes de finalizar.</p>
            )}
            <button type="button" onClick={onManageAddresses} className="text-sm text-secondary underline">Gerenciar endereços</button>
            {error && <p role="alert" className="text-sm text-primary">{error}</p>}
            <AppButton type="button" block disabled={busy || !addresses.length} onClick={() => void checkout()}>
              {busy ? 'Conectando ao pagamento...' : 'Finalizar compra'}
            </AppButton>
            <p className="text-xs text-muted">O pagamento é processado pelo Mercado Pago. O site não recebe nem armazena dados do cartão.</p>
          </div>
        </>
      )}
    </section>
  );
}
