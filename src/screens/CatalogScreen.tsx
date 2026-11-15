import type { ReactNode } from 'react';
import { Store } from 'lucide-react';

interface CatalogScreenProps {
  children: ReactNode;
  productCount: number;
}

export function CatalogScreen({ children, productCount }: CatalogScreenProps) {
  return (
    <section aria-labelledby="catalog-title">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-11 h-11 shrink-0 rounded-2xl bg-surface border border-border flex items-center justify-center">
          <Store className="w-5 h-5 text-primary" aria-hidden="true" />
        </div>
        <div>
          <h2 id="catalog-title" className="font-display text-xl font-semibold text-primary leading-tight">
            Catálogo de Laços
          </h2>
          <p className="text-xs text-muted">Encontre seu próximo encanto!</p>
        </div>
      </div>
      {children}
      <p className="sr-only">{productCount} produtos no catálogo</p>
    </section>
  );
}
