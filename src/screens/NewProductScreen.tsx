import { PlusCircle } from 'lucide-react';
import type { Product, ProductDraft } from '@/types';
import { ProductForm } from '@/components/catalog/ProductForm';

interface NewProductScreenProps {
  product?: Product;
  onSave: (data: ProductDraft) => Promise<void>;
  onCancel: () => void;
}

export function NewProductScreen({ product, onSave, onCancel }: NewProductScreenProps) {
  return (
    <section aria-labelledby="new-product-title">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-11 h-11 shrink-0 rounded-2xl bg-surface border border-border flex items-center justify-center">
          <PlusCircle className="w-5 h-5 text-accent" aria-hidden="true" />
        </div>
        <div>
          <h2 id="new-product-title" className="font-display text-xl font-semibold text-primary leading-tight">
            {product ? 'Editar produto' : 'Novo Cadastro'}
          </h2>
          <p className="text-xs text-muted">{product ? 'Atualize os dados e as opções do produto.' : 'Adicione um novo modelo ao catálogo.'}</p>
        </div>
      </div>
      <div className="rounded-2xl bg-surface border border-border p-4 sm:p-6 shadow-soft">
        <ProductForm product={product} onSave={onSave} onCancel={onCancel} />
      </div>
    </section>
  );
}
