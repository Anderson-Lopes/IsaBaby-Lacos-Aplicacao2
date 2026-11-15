import { ShieldCheck } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  message: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon: Icon = ShieldCheck, title, message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="relative mb-5">
        <div className="absolute inset-0 rounded-full bg-primary/10 blur-xl" aria-hidden="true" />
        <div className="relative w-20 h-20 rounded-full bg-surface border border-border flex items-center justify-center">
          <Icon className="w-9 h-9 text-secondary" aria-hidden="true" />
        </div>
      </div>
      <h3 className="text-lg font-semibold text-primary mb-1.5">{title}</h3>
      <p className="text-sm text-muted max-w-[240px] leading-relaxed">{message}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-6 inline-flex items-center justify-center min-h-[44px] px-5 rounded-xl bg-accent text-background text-sm font-semibold hover:bg-accent/85 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
