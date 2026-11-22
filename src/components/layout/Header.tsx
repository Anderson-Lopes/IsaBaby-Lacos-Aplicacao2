import { KeyRound, LogOut, Plus, Sparkles } from 'lucide-react';
import { ShoppingBag } from 'lucide-react';

interface HeaderProps {
  username?: string;
  isAdmin: boolean;
  cartCount: number;
  onAdminLogin: () => void;
  onCart: () => void;
  onNewProduct?: () => void;
  onChangePassword?: () => void;
  onSignOut?: () => void;
}

export function Header({ username, isAdmin, cartCount, onAdminLogin, onCart, onNewProduct, onChangePassword, onSignOut }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/60">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 shrink-0 rounded-full bg-surface border border-border flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-lg sm:text-xl font-semibold text-primary leading-tight truncate">
              IsaBaby Laços
            </h1>
            <p className="text-[11px] sm:text-xs text-muted tracking-wide">
              Encantos feitos à mão
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isAdmin && <span className="hidden sm:inline text-xs text-muted">{username} · Administração</span>}
          {isAdmin && (
            <button
              onClick={onNewProduct}
              className="inline-flex items-center gap-1.5 min-h-[44px] px-3.5 sm:px-4 rounded-xl bg-accent text-background text-sm font-semibold hover:bg-accent/85 active:bg-accent/75 transition-colors"
            >
              <Plus className="w-4 h-4" strokeWidth={2.5} aria-hidden="true" />
              <span className="hidden sm:inline">Novo produto</span>
              <span className="sm:hidden">Novo</span>
            </button>
          )}
          {!isAdmin && (
            <button type="button" onClick={onAdminLogin} className="min-h-[44px] px-2 rounded-xl text-xs text-muted hover:text-primary">Administração</button>
          )}
          {!isAdmin && (
            <button type="button" onClick={onCart} aria-label={`Carrinho, ${cartCount} itens`} title="Carrinho"
              className="relative inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl text-secondary hover:bg-secondary/10">
              <ShoppingBag className="w-5 h-5" aria-hidden="true" />
              {cartCount > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 rounded-full bg-primary text-background text-[10px] font-bold flex items-center justify-center">{cartCount}</span>}
            </button>
          )}
          {isAdmin && onChangePassword && (
            <button onClick={onChangePassword} aria-label="Alterar senha" title="Alterar senha" className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-2 rounded-xl text-secondary hover:bg-secondary/10">
              <KeyRound className="w-4 h-4" aria-hidden="true" />
              <span className="hidden lg:inline text-xs">Alterar senha</span>
            </button>
          )}
          {isAdmin && onSignOut && (
            <button onClick={onSignOut} aria-label="Sair" title="Sair" className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl text-muted hover:bg-surface-hover">
              <LogOut className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
