import type { LucideIcon } from 'lucide-react';

export interface StatusBadgeProps {
  icon: LucideIcon;
  label: string;
  className: string;
}

export function StatusBadge({ icon: Icon, label, className }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide ${className}`}
    >
      <Icon className="w-3 h-3" aria-hidden="true" />
      {label}
    </span>
  );
}
