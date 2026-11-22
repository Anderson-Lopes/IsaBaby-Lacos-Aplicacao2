import { CheckCircle2, Clock, PackageSearch } from 'lucide-react';
import type { Product, ProductStatus } from '@/types';
import { formatPrice, PRODUCT_STATUS_LABELS } from '@/lib/constants';
import { StatusBadge } from '@/components/ui/StatusBadge';

const statusStyles: Record<ProductStatus, { className: string; icon: typeof CheckCircle2 }> = {
  ativo: {
    className: 'text-ink border-ink/40 bg-ink/10',
    icon: CheckCircle2,
  },
  sob_encomenda: {
    className: 'text-secondary border-secondary/40 bg-secondary/10',
    icon: Clock,
  },
  indisponivel: {
    className: 'text-muted border-border bg-surface',
    icon: PackageSearch,
  },
};

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
  isAdmin?: boolean;
  onEdit?: (product: Product) => void;
  onDelete?: (product: Product) => void;
}

export function ProductCard({ product, onSelect, isAdmin = false, onEdit, onDelete }: ProductCardProps) {
  const available = product.status !== 'indisponivel' && (product.status !== 'ativo' || product.quantity > 0);
  const style = statusStyles[available ? product.status : 'indisponivel'];
  const statusLabel = available ? PRODUCT_STATUS_LABELS[product.status] : 'Indisponível';

  return (
    <article className="group relative flex flex-col text-left rounded-2xl bg-surface border border-border hover:border-primary/50 hover:bg-surface-hover hover:shadow-lifted transition-all duration-200 overflow-hidden">
      <button type="button" onClick={() => onSelect(product)}
        aria-label={`Personalizar ${product.name}, ${formatPrice(product.price)}`}
        disabled={!available}
        className="flex flex-col text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-not-allowed">
        <div className="relative aspect-[4/3] overflow-hidden bg-background">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={`Foto do ${product.name}`} loading="lazy"
              className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${!available ? 'grayscale opacity-40' : ''}`} />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <PackageSearch className="w-10 h-10 text-secondary/40" aria-hidden="true" />
            </div>
          )}
          <div className="absolute top-2.5 left-2.5">
            <StatusBadge icon={style.icon} label={statusLabel} className={style.className} />
          </div>
          {!available && (
            <span className="absolute inset-0 flex items-center justify-center bg-background/50">
              <span className="text-[11px] font-bold uppercase tracking-widest text-muted bg-background/80 border border-border rounded-full px-3 py-1">
                Indisponível
              </span>
            </span>
          )}
        </div>
        <div className="flex flex-col gap-1 p-4">
          <h3 className="font-display text-base font-semibold text-primary leading-snug">{product.name}</h3>
          <p className="text-xs text-secondary">{product.model}</p>
          {product.description && <p className="text-xs text-muted line-clamp-2">{product.description}</p>}
          <div className="mt-2 flex items-center justify-between">
            <span className="text-lg font-semibold text-ink">{formatPrice(product.price)}</span>
            <span className="text-[11px] text-muted">{product.status === 'ativo' ? `${product.quantity} un.` : PRODUCT_STATUS_LABELS[product.status]}</span>
          </div>
          <span className="mt-2 text-sm font-semibold text-primary">Personalizar</span>
        </div>
      </button>
      {isAdmin && (
        <div className="flex gap-2 p-3 pt-0">
          <button type="button" onClick={() => onEdit?.(product)} className="min-h-[40px] flex-1 rounded-lg border border-border text-sm text-secondary hover:border-secondary">
            Editar
          </button>
          <button type="button" onClick={() => onDelete?.(product)} className="min-h-[40px] flex-1 rounded-lg border border-border text-sm text-primary hover:border-primary">
            Excluir
          </button>
        </div>
      )}
    </article>
  );
}
