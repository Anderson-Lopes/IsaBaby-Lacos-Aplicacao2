import { useMemo, useState } from 'react';
import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import type { CartItem } from '@/types';
import { formatPrice, SELLER_WHATSAPP } from '@/lib/constants';
import { EmptyState } from '@/components/ui/EmptyState';
import { AppButton } from '@/components/ui/AppButton';

interface CartScreenProps {
  items: CartItem[];
  onQuantityChange: (index: number, quantity: number) => void;
  onRemove: (index: number) => void;
  onEdit: (index: number) => void;
  onContinueShopping: () => void;
  onCheckout: (customerName: string, observations: string) => void;
}

export function CartScreen({
  items, onQuantityChange, onRemove, onEdit, onContinueShopping, onCheckout,
}: CartScreenProps) {
  const [customerName, setCustomerName] = useState('');
  const [observations, setObservations] = useState('');
  const [error, setError] = useState<string | null>(null);
  const total = useMemo(() => items.reduce((sum, item) => sum + item.total, 0), [items]);

  if (items.length === 0) {
    return (
      <section aria-labelledby="cart-title">
        <h2 id="cart-title" className="font-display text-xl font-semibold text-primary mb-5">Seu carrinho</h2>
        <EmptyState icon={ShoppingBag} title="Seu carrinho está vazio" message="Explore o catálogo e personalize os laços que deseja." action={{ label: 'Continuar comprando', onClick: onContinueShopping }} />
      </section>
    );
  }

  const handleCheckout = (event: React.FormEvent) => {
    event.preventDefault();
    if (!customerName.trim()) {
      setError('Informe seu nome para enviar o pedido.');
      return;
    }
    if (!SELLER_WHATSAPP) {
      setError('O WhatsApp da vendedora ainda não foi configurado. Fale com a administração da loja.');
      return;
    }
    setError(null);
    onCheckout(customerName.trim(), observations.trim());
  };

  return (
    <section aria-labelledby="cart-title" className="space-y-5">
      <div>
        <h2 id="cart-title" className="font-display text-xl font-semibold text-primary">Seu carrinho</h2>
        <p className="text-sm text-muted mt-1">Revise as personalizações antes de enviar o pedido.</p>
      </div>

      <ul className="space-y-3">
        {items.map((item, index) => (
          <li key={`${item.productId}-${index}`} className="rounded-2xl bg-surface border border-border p-4 sm:p-5">
            <div className="flex gap-4">
              {item.imageUrl && <img src={item.imageUrl} alt="" className="w-20 h-20 rounded-xl object-cover shrink-0" />}
              <div className="min-w-0 flex-1">
                <div className="flex justify-between gap-3">
                  <h3 className="font-semibold text-primary">{item.productName}</h3>
                  <button type="button" onClick={() => onRemove(index)} aria-label={`Remover ${item.productName}`}
                    className="h-10 w-10 shrink-0 rounded-lg text-muted hover:bg-primary/10 hover:text-primary">
                    <Trash2 className="w-4 h-4 mx-auto" aria-hidden="true" />
                  </button>
                </div>
                <p className="mt-1 text-xs text-muted">
                  {Object.entries(item.customizations ?? {}).map(([name, value]) => `${name}: ${value}`).join(' · ') || 'Sem personalizações'}
                </p>
                {item.notes && <p className="mt-1 text-xs text-secondary">Observação: {item.notes}</p>}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="inline-flex items-center gap-2">
                    <button type="button" aria-label="Diminuir quantidade" onClick={() => onQuantityChange(index, item.quantity - 1)}
                      disabled={item.quantity <= 1} className="h-9 w-9 rounded-lg border border-border disabled:opacity-40">
                      <Minus className="w-3.5 h-3.5 mx-auto" aria-hidden="true" />
                    </button>
                    <span className="min-w-6 text-center">{item.quantity}</span>
                    <button type="button" aria-label="Aumentar quantidade" onClick={() => onQuantityChange(index, item.quantity + 1)}
                      className="h-9 w-9 rounded-lg border border-border">
                      <Plus className="w-3.5 h-3.5 mx-auto" aria-hidden="true" />
                    </button>
                    <button type="button" onClick={() => onEdit(index)} className="ml-1 min-h-9 px-2 text-xs font-medium text-secondary underline">Editar</button>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted">{formatPrice(item.unitPrice)} cada</p>
                    <p className="font-semibold text-ink">{formatPrice(item.total)}</p>
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <form onSubmit={handleCheckout} className="rounded-2xl bg-surface border border-border p-4 sm:p-5 space-y-4">
        <div className="flex justify-between items-center border-b border-border pb-3">
          <span className="font-semibold text-primary">Total</span>
          <span className="text-xl font-semibold text-ink">{formatPrice(total)}</span>
        </div>
        <div>
          <label htmlFor="customer-name" className="block text-xs font-semibold text-secondary mb-2">Seu nome</label>
          <input id="customer-name" required value={customerName} onChange={(event) => setCustomerName(event.target.value)}
            maxLength={100} autoComplete="name" className="input-field" />
        </div>
        <div>
          <label htmlFor="order-observations" className="block text-xs font-semibold text-secondary mb-2">Observações do pedido</label>
          <textarea id="order-observations" value={observations} onChange={(event) => setObservations(event.target.value)}
            maxLength={500} className="input-field min-h-20 resize-y" />
        </div>
        {error && <p role="alert" className="text-sm text-primary">{error}</p>}
        {!SELLER_WHATSAPP && <p className="text-xs text-muted">Checkout indisponível até configurar o WhatsApp da vendedora.</p>}
        <AppButton type="submit" icon={ShoppingBag} block>Finalizar pedido pelo WhatsApp</AppButton>
        <AppButton type="button" variant="secondary" block onClick={onContinueShopping}>Continuar comprando</AppButton>
      </form>
    </section>
  );
}
