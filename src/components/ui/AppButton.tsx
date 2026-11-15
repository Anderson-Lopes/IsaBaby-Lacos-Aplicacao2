import type { ButtonHTMLAttributes } from 'react';
import type { LucideIcon } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'accent';

interface AppButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: LucideIcon;
  variant?: Variant;
  block?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    'bg-primary text-background hover:bg-primary/85 active:bg-primary/75 shadow-soft',
  secondary:
    'bg-transparent text-secondary border border-secondary/50 hover:bg-secondary/10 hover:border-secondary active:bg-secondary/15',
  accent:
    'bg-accent text-background hover:bg-accent/85 active:bg-accent/75 shadow-soft',
};

export function AppButton({
  icon: Icon,
  variant = 'primary',
  block = false,
  className = '',
  children,
  ...props
}: AppButtonProps) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-semibold tracking-wide transition-all duration-200 disabled:opacity-40 disabled:pointer-events-none ${variants[variant]} ${block ? 'w-full' : ''} ${className}`}
    >
      {Icon && <Icon className="w-4 h-4" strokeWidth={2.25} aria-hidden="true" />}
      {children}
    </button>
  );
}
