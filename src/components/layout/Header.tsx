import { Plus, Sparkles } from 'lucide-react';

interface HeaderProps {
  onNewProduct: () => void;
}

export function Header({ onNewProduct }: HeaderProps) {
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
        <button
          onClick={onNewProduct}
          className="inline-flex items-center gap-1.5 min-h-[44px] px-3.5 sm:px-4 rounded-xl bg-accent text-background text-sm font-semibold hover:bg-accent/85 active:bg-accent/75 transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" strokeWidth={2.5} aria-hidden="true" />
          <span className="hidden sm:inline">Novo Cadastro</span>
          <span className="sm:hidden">Novo</span>
        </button>
      </div>
    </header>
  );
}
