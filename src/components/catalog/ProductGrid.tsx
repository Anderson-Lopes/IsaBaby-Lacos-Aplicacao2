import { useMemo, useState } from 'react';
import type { Product } from '@/types';
import { ProductCard } from './ProductCard';
import { SearchInput } from '@/components/ui/SearchInput';
import { EmptyState } from '@/components/ui/EmptyState';

interface ProductGridProps {
  products: Product[];
  onSelect: (product: Product) => void;
  onNewProduct?: () => void;
  isAdmin?: boolean;
  onEdit?: (product: Product) => void;
  onDelete?: (product: Product) => void;
}

export function ProductGrid({ products, onSelect, onNewProduct, isAdmin = false, onEdit, onDelete }: ProductGridProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const categories = useMemo(
    () => [...new Set(products.map((product) => product.category?.trim()).filter((value): value is string => Boolean(value)))].sort(),
    [products]
  );

  const filtered = products.filter((p) => {
    const q = query.trim().toLowerCase();
    const matchesText = !q || (
      p.name.toLowerCase().includes(q) ||
      p.model.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q)
    );
    return matchesText && (!category || p.category === category);
  });

  if (products.length === 0) {
    return (
      <EmptyState
        icon={ProductIcon}
        title="Nenhum item cadastrado"
        message="Seus novos modelos aparecerão aqui."
        action={onNewProduct ? { label: 'Cadastrar primeiro produto', onClick: onNewProduct } : undefined}
      />
    );
  }

  return (
    <div>
      <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <SearchInput value={query} onChange={setQuery} placeholder="Buscar laço por nome ou modelo..." />
        <select value={category} onChange={(event) => setCategory(event.target.value)} className="input-field" aria-label="Filtrar por categoria">
          <option value="">Todas as categorias</option>
          {categories.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </div>
      <p className="text-xs text-muted mb-3" aria-live="polite">
        {filtered.length === 0
          ? 'Nenhum laço encontrado para essa busca.'
          : `${filtered.length} ${filtered.length === 1 ? 'produto encontrado' : 'produtos encontrados'}`}
      </p>
      {filtered.length === 0 ? (
        <EmptyState
          icon={SearchIcon}
          title="Busca sem resultados"
          message="Tente pesquisar por outro nome ou modelo de laço."
          action={{ label: 'Limpar pesquisa', onClick: () => setQuery('') }}
        />
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((product) => (
            <li key={product.id}>
              <ProductCard product={product} onSelect={onSelect} isAdmin={isAdmin} onEdit={onEdit} onDelete={onDelete} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ProductIcon(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={props.className} aria-hidden="true">
      <path d="M12 13c-2-3-6-4.5-6-7a3 3 0 0 1 6-1 3 3 0 0 1 6 1c0 2.5-4 4-6 7Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 21v-4M16 21v-4M12 13v8" strokeLinecap="round" />
    </svg>
  );
}

function SearchIcon(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={props.className} aria-hidden="true">
      <circle cx="11" cy="11" r="7" strokeLinecap="round" />
      <path d="m21 21-4.3-4.3" strokeLinecap="round" />
    </svg>
  );
}
