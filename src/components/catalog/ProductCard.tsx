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
}

export function ProductCard({ product, onSelect }: ProductCardProps) {
  const available = product.status !== 'indisponivel';
  const style = statusStyles[product.status];

  return (
    <button
      onClick={() => onSelect(product)}
      aria-label={`Ver detalhes de ${product.name}, ${formatPrice(product.promotionalPrice ?? product.price)}`}
      className="group relative flex flex-col text-left rounded-2xl bg-surface border border-border hover:border-primary/50 hover:bg-surface-hover hover:shadow-lifted transition-all duration-200 overflow-hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-not-allowed"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-background">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={`Foto do ${product.name}`}
            loading="lazy"
            className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${!available ? 'grayscale opacity-40' : ''}`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <PackageSearch className="w-10 h-10 text-secondary/40" aria-hidden="true" />
          </div>
        )}
        <div className="absolute top-2.5 left-2.5">
          <StatusBadge
            icon={style.icon}
            label={PRODUCT_STATUS_LABELS[product.status]}
            className={style.className}
          />
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
        <h3 className="font-display text-base font-semibold text-primary leading-snug">
          {product.name}
        </h3>
        <p className="text-xs text-secondary">{product.model}</p>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-lg font-semibold text-ink">{formatPrice(product.promotionalPrice ?? product.price)}</span>
          <span className="text-[11px] text-muted">
            {product.quantity} un.
          </span>
        </div>
      </div>
    </button>
  );
}
