import { useState } from 'react';
import { CheckCircle2, Clock, Minus, PackageSearch, Plus, ShoppingCart } from 'lucide-react';
import type { Product } from '@/types';
import type { CartItem } from '@/types';
import { PRODUCT_STATUS_LABELS, formatPrice } from '@/lib/constants';
import { AppButton } from '@/components/ui/AppButton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { CustomizationSelector } from './CustomizationSelector';

interface ProductDetailsProps {
  product: Product;
  onAddToOrder: (item: CartItem) => void;
  onBack: () => void;
  initialItem?: CartItem;
}

export function ProductDetails({ product, onAddToOrder, onBack, initialItem }: ProductDetailsProps) {
  const [customizations, setCustomizations] = useState<Record<string, string>>(() => {
    if (initialItem?.customizations) return initialItem.customizations;
    return product.options.reduce<Record<string, string>>((values, option) => {
      if (option.values[0]) values[option.name] = option.values[0];
      return values;
    }, {});
  });
  const [quantity, setQuantity] = useState(initialItem?.quantity ?? 1);
  const [notes, setNotes] = useState(initialItem?.notes ?? '');
  const [added, setAdded] = useState(false);

  const unavailable = product.status === 'indisponivel' || (product.status === 'ativo' && product.quantity <= 0);
  const maxQuantity = product.status === 'ativo' ? product.quantity : 99;
  const total = product.price * quantity;
  const color = Object.entries(customizations).find(([name]) => name.toLocaleLowerCase() === 'cor')?.[1] ?? '';
  const size = Object.entries(customizations).find(([name]) => name.toLocaleLowerCase() === 'tamanho')?.[1] ?? '';

  const invalidQuantity = quantity < 1 || quantity > maxQuantity;

  const handleAdd = () => {
    if (unavailable || invalidQuantity) return;
    onAddToOrder({
      productId: product.id,
      productName: product.name,
      imageUrl: product.imageUrl,
      customizations,
      color,
      size,
      quantity,
      unitPrice: product.price,
      total,
      notes: notes.trim() || undefined,
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 3000);
  };

  return (
    <section aria-labelledby="details-title" className="space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="text-sm text-secondary hover:text-primary transition-colors min-h-[44px] inline-flex items-center gap-1"
      >
        &larr; Voltar ao catálogo
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-2xl overflow-hidden bg-surface border border-border shadow-soft">
          <div className="relative aspect-[4/3] bg-background">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={`Foto do ${product.name}`}
                className={`w-full h-full object-cover ${unavailable ? 'grayscale opacity-40' : ''}`}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted text-sm">
                Sem imagem
              </div>
            )}
            <div className="absolute top-3 left-3">
              <StatusBadge
                icon={unavailable ? PackageSearch : product.status === 'sob_encomenda' ? Clock : CheckCircle2}
                label={unavailable ? 'Indisponível' : PRODUCT_STATUS_LABELS[product.status]}
                className={
                  unavailable
                    ? 'text-muted border-border bg-surface'
                    : product.status === 'sob_encomenda'
                      ? 'text-secondary border-secondary/40 bg-secondary/10'
                      : 'text-ink border-ink/40 bg-ink/10'
                }
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-surface border border-border p-5 shadow-soft">
          <h2 id="details-title" className="font-display text-2xl font-semibold text-primary leading-tight">
            {product.name}
          </h2>
          <p className="text-sm text-secondary mt-0.5">{product.model}</p>
          {product.description && (
            <p className="text-sm text-muted leading-relaxed mt-3">{product.description}</p>
          )}
          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-2xl font-semibold text-ink">{formatPrice(product.price)}</span>
            <span className="text-xs text-muted">
              {unavailable ? 'Indisponível' : product.status === 'ativo' ? `${product.quantity} disponíveis` : 'preço unitário'}
            </span>
          </div>

          <div className="mt-6 space-y-5">
            {product.options.map((option, index) => (
              <CustomizationSelector
                key={option.id ?? option.name}
                title={option.name}
                icon={index === 0 ? PaletteIcon : RulerIcon}
                options={option.values.map((value) => ({ id: value, label: value }))}
                selected={customizations[option.name] ?? ''}
                onChange={(value) => setCustomizations((current) => ({ ...current, [option.name]: value }))}
              />
            ))}

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-secondary mb-2.5">
                Quantidade
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  aria-label="Diminuir quantidade"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  className="w-11 h-11 rounded-xl bg-surface-hover border border-border flex items-center justify-center text-primary hover:border-primary/50 transition-colors disabled:opacity-40 disabled:pointer-events-none"
                >
                  <Minus className="w-4 h-4" aria-hidden="true" />
                </button>
                <input
                  type="number"
                  aria-label="Quantidade"
                  min={1}
                  max={maxQuantity}
                  value={quantity}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    setQuantity(Number.isNaN(value) ? 1 : Math.max(1, Math.min(maxQuantity, value)));
                  }}
                  className="input-field w-20 text-center"
                />
                <button
                  type="button"
                  aria-label="Aumentar quantidade"
                  onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
                  disabled={quantity >= maxQuantity}
                  className="w-11 h-11 rounded-xl bg-surface-hover border border-border flex items-center justify-center text-primary hover:border-primary/50 transition-colors disabled:opacity-40 disabled:pointer-events-none"
                >
                  <Plus className="w-4 h-4" aria-hidden="true" />
                </button>
                {invalidQuantity && (
                  <p className="text-xs text-primary" role="alert">
                    Informe uma quantidade entre 1 e {maxQuantity}.
                  </p>
                )}
              </div>
            </div>

            <div>
              <label
                htmlFor="notes"
                className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-2.5"
              >
                Observações
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex.: laço para cabelo infantil, acabamento em pérolas..."
                maxLength={200}
                className="input-field min-h-[80px] resize-y"
              />
            </div>

            <div className="rounded-xl bg-background border border-border p-4 space-y-1.5">
              {Object.entries(customizations).map(([name, value]) => (
                <div key={name} className="flex justify-between text-xs text-muted">
                  <span>{name}</span><span>{value}</span>
                </div>
              ))}
              <div className="flex justify-between text-xs text-muted">
                <span>Valor unitário</span>
                <span>{formatPrice(product.price)}</span>
              </div>
              <div className="flex justify-between text-xs text-muted">
                <span>Quantidade</span>
                <span aria-live="polite">{quantity}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold text-ink pt-1.5 border-t border-border">
                <span>Total</span>
                <span aria-live="polite">{formatPrice(total)}</span>
              </div>
            </div>

            {added && (
              <div
                role="status"
                className="flex items-center gap-2 rounded-xl border border-ink/40 bg-ink/10 px-4 py-3 text-sm text-ink"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                Adicionado ao pedido!
              </div>
            )}

            <AppButton
              icon={ShoppingCart}
              block
              onClick={handleAdd}
              disabled={unavailable || invalidQuantity}
            >
              {unavailable ? 'Produto indisponível' : 'Adicionar ao pedido'}
            </AppButton>
          </div>
        </div>
      </div>
    </section>
  );
}

function PaletteIcon(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={props.className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <circle cx="8" cy="9" r="1" /><circle cx="12" cy="7" r="1" /><circle cx="16" cy="9" r="1" />
      <path d="M12 21v-4a2 2 0 0 1 2-2h1a2 2 0 0 0 0-4h-1" />
    </svg>
  );
}

function RulerIcon(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={props.className} aria-hidden="true">
      <rect x="3" y="8" width="18" height="8" rx="2" />
      <path d="M8 8v3M12 8v3M16 8v3" strokeLinecap="round" />
    </svg>
  );
}
