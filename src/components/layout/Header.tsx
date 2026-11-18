import { LogIn, LogOut, Plus, Shield, ShoppingBag, Sparkles, UserRound } from 'lucide-react';
import type { UserProfile } from '@/types';

interface HeaderProps {
  onNewProduct: () => void;
  onSignIn: () => void;
  onAccount: () => void;
  onAdmin: () => void;
  onCart: () => void;
  onSignOut: () => void;
  profile: UserProfile | null;
  cartCount: number;
}

export function Header({ onNewProduct, onSignIn, onAccount, onAdmin, onCart, onSignOut, profile, cartCount }: HeaderProps) {
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
          {profile?.role === 'admin' && (
            <>
              <button onClick={onAdmin} aria-label="Painel administrativo" title="Painel administrativo" className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl text-primary hover:bg-primary/10">
                <Shield className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                onClick={onNewProduct}
                className="inline-flex items-center gap-1.5 min-h-[44px] px-3.5 sm:px-4 rounded-xl bg-accent text-background text-sm font-semibold hover:bg-accent/85 active:bg-accent/75 transition-colors"
              >
                <Plus className="w-4 h-4" strokeWidth={2.5} aria-hidden="true" />
                <span className="hidden sm:inline">Novo produto</span>
                <span className="sm:hidden">Novo</span>
              </button>
            </>
          )}
          {profile && (
            <>
              <button onClick={onCart} aria-label={`Carrinho, ${cartCount} itens`} title="Carrinho" className="relative inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl text-primary hover:bg-primary/10">
                <ShoppingBag className="w-4 h-4" aria-hidden="true" />
                {cartCount > 0 && <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-accent px-1 text-[10px] leading-5 text-white">{cartCount}</span>}
              </button>
              <button onClick={onAccount} aria-label="Minha conta" title="Minha conta" className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl text-primary hover:bg-primary/10">
                <UserRound className="w-4 h-4" aria-hidden="true" />
              </button>
              <button onClick={onSignOut} aria-label="Sair" title="Sair" className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl text-muted hover:bg-primary/10 hover:text-primary">
                <LogOut className="w-4 h-4" aria-hidden="true" />
              </button>
              <span className="hidden lg:inline max-w-32 truncate text-xs text-muted">{profile.fullName || profile.email}</span>
            </>
          )}
          {!profile && (
            <button onClick={onSignIn} className="inline-flex items-center gap-1.5 min-h-[44px] px-3.5 rounded-xl bg-accent text-background text-sm font-semibold hover:bg-accent/85">
              <LogIn className="w-4 h-4" aria-hidden="true" />
              Entrar
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
