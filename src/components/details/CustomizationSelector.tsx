import { useState } from 'react';
import { Check, Heart } from 'lucide-react';

interface CustomizationSelectorProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  options: { id: string; label: string; hex?: string }[];
  selected: string;
  onChange: (id: string) => void;
}

export function CustomizationSelector({ title, icon: Icon, options, selected, onChange }: CustomizationSelectorProps) {
  const [lastTouched, setLastTouched] = useState<string | null>(null);

  return (
    <fieldset className="min-w-0">
      <legend className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-secondary mb-2.5">
        <Icon className="w-3.5 h-3.5" aria-hidden="true" />
        {title}
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = selected === option.id;
          const isRecent = lastTouched === option.id && isSelected;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => {
                onChange(option.id);
                setLastTouched(option.id);
              }}
              className={`inline-flex items-center gap-2 min-h-[44px] px-4 rounded-full border text-sm font-medium transition-all duration-200 ${
                isSelected
                  ? 'border-primary bg-primary/15 text-primary shadow-soft'
                  : 'border-border bg-surface text-muted hover:border-secondary/60 hover:text-secondary'
              }`}
            >
              {option.hex && (
                <span
                  className="w-3.5 h-3.5 rounded-full border border-background/30"
                  style={{ backgroundColor: option.hex }}
                  aria-hidden="true"
                />
              )}
              {option.label}
              {isRecent && <Heart className="w-3 h-3 text-primary" aria-hidden="true" />}
              {isSelected && !isRecent && <Check className="w-3.5 h-3.5" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
