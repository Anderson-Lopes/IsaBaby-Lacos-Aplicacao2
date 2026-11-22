import { Store, PlusCircle, ClipboardList, ShoppingBag } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Screen } from '@/App';

interface BottomNavigationProps {
  active: Screen;
  isAdmin: boolean;
  onChange: (screen: Screen) => void;
}

const items: { id: Screen; label: string; icon: LucideIcon }[] = [
  { id: 'catalog', label: 'Catálogo', icon: Store },
  { id: 'newProduct', label: 'Cadastro', icon: PlusCircle },
  { id: 'orders', label: 'Pedidos', icon: ClipboardList },
];

export function BottomNavigation({ active, isAdmin, onChange }: BottomNavigationProps) {
  const visibleItems = isAdmin
    ? items
    : [
        items[0],
        { id: 'cart' as Screen, label: 'Carrinho', icon: ShoppingBag },
      ];
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed bottom-0 inset-x-0 z-40 bg-surface/95 backdrop-blur-md border-t border-border pb-safe md:left-auto md:right-6 md:bottom-6 md:border md:rounded-2xl md:shadow-lifted md:bg-surface"
    >
      <ul className="max-w-md mx-auto md:mx-0 flex">
        {visibleItems.map(({ id, label, icon: Icon }) => {
          const isActive = active === id;
          return (
            <li key={id} className="flex-1 md:flex-none">
              <button
                onClick={() => onChange(id)}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full md:w-auto flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 min-h-[64px] md:min-h-[44px] md:px-5 py-2 text-[11px] md:text-sm font-medium transition-colors md:rounded-xl ${
                  isActive
                    ? 'text-primary md:bg-primary/10'
                    : 'text-muted hover:text-secondary active:text-primary'
                }`}
              >
                <Icon
                  className={`w-5 h-5 md:w-4 md:h-4 transition-transform ${isActive ? 'scale-110' : ''}`}
                  strokeWidth={isActive ? 2.25 : 1.75}
                  aria-hidden="true"
                />
                {label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
