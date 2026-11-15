import type { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from 'react';
import type { LucideIcon } from 'lucide-react';

interface BaseFieldProps {
  label: string;
  name?: string;
  error?: string;
  required?: boolean;
  icon?: LucideIcon;
}

interface FormFieldInputProps extends Omit<BaseFieldProps, 'name'>, InputHTMLAttributes<HTMLInputElement> {
  kind?: 'input';
  prefix?: string;
}

interface FormFieldTextareaProps
  extends Omit<BaseFieldProps, 'name'>,
    TextareaHTMLAttributes<HTMLTextAreaElement> {
  kind: 'textarea';
}

interface FormFieldSelectProps extends Omit<BaseFieldProps, 'name'>, SelectHTMLAttributes<HTMLSelectElement> {
  kind: 'select';
  options: { value: string; label: string }[];
}

export type FormFieldProps = FormFieldInputProps | FormFieldTextareaProps | FormFieldSelectProps;

function FieldWrapper({
  label,
  name,
  error,
  required,
  icon: Icon,
  children,
}: Omit<BaseFieldProps, 'name'> & { name: string; children: React.ReactNode }) {
  return (
    <div>
      <label
        htmlFor={name}
        className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-secondary mb-1.5"
      >
        {Icon && <Icon className="w-3.5 h-3.5" aria-hidden="true" />}
        {label}
        {required && (
          <span className="text-primary normal-case font-sans" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children}
      {error && (
        <p className="mt-1.5 text-xs text-primary flex items-center gap-1" role="alert" id={`${name}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}

export function FormField(props: FormFieldProps) {
  const { label, error, required, icon } = props;
  const name = 'name' in props && typeof props.name === 'string' ? props.name : '';

  if (props.kind === 'textarea') {
    const { kind: _k, label: _l, name: _n, error: _e, required: _r, icon: _i, ...rest } = props;
    return (
      <FieldWrapper label={label} name={name} error={error} required={required} icon={icon}>
        <textarea
          id={name}
          name={name}
          aria-invalid={!!error}
          aria-describedby={error ? `${name}-error` : undefined}
          {...rest}
          className="input-field min-h-[96px] resize-y"
        />
      </FieldWrapper>
    );
  }

  if (props.kind === 'select') {
    const { kind: _k, label: _l, name: _n, error: _e, required: _r, icon: _i, options, ...rest } = props;
    return (
      <FieldWrapper label={label} name={name} error={error} required={required} icon={icon}>
        <select id={name} name={name} aria-invalid={!!error} {...rest} className="input-field appearance-none">
          {options.map((o) => (
            <option key={o.value} value={o.value} className="bg-surface text-ink">
              {o.label}
            </option>
          ))}
        </select>
      </FieldWrapper>
    );
  }

  const {
    kind: _k,
    label: _l,
    name: _n,
    error: _e,
    required: _r,
    icon: _i,
    prefix,
    ...rest
  } = props;
  return (
    <FieldWrapper label={label} name={name} error={error} required={required} icon={icon}>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted">{prefix}</span>
        )}
        <input
          id={name}
          name={name}
          aria-invalid={!!error}
          aria-describedby={error ? `${name}-error` : undefined}
          {...rest}
          className={`input-field ${prefix ? 'pl-10' : ''}`}
        />
      </div>
    </FieldWrapper>
  );
}
