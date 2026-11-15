import { useState } from 'react';
import { ImagePlus, Tag, Coins, Boxes, FileText, Ribbon } from 'lucide-react';
import type { Product, ProductStatus } from '@/types';
import { AppButton } from '@/components/ui/AppButton';
import { FormField } from '@/components/ui/FormField';

interface ProductFormProps {
  onSave: (data: Omit<Product, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
}

interface FormState {
  name: string;
  model: string;
  description: string;
  price: string;
  quantity: string;
  status: ProductStatus;
  imageUrl: string;
}

type FormErrors = Partial<Record<keyof FormState, string>>;

const initialForm: FormState = {
  name: '',
  model: '',
  description: '',
  price: '',
  quantity: '',
  status: 'ativo',
  imageUrl: '',
};

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {};
  if (!form.name.trim()) errors.name = 'Informe o nome do produto.';
  if (!form.model.trim()) errors.model = 'Informe o modelo do laço.';
  const price = Number(form.price);
  if (!form.price.trim()) errors.price = 'Informe o preço.';
  else if (Number.isNaN(price) || price <= 0) errors.price = 'O preço deve ser maior que zero.';
  const qty = Number(form.quantity);
  if (!form.quantity.trim()) errors.quantity = 'Informe a quantidade.';
  else if (!Number.isInteger(qty) || qty < 0) errors.quantity = 'A quantidade não pode ser negativa.';
  return errors;
}

export function ProductForm({ onSave, onCancel }: ProductFormProps) {
  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [savedName, setSavedName] = useState<string | null>(null);

  const set = (key: keyof FormState) => (value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const validation = validate(form);
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return;
    }
    onSave({
      name: form.name.trim(),
      model: form.model.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      quantity: Number(form.quantity),
      status: form.status,
      imageUrl: form.imageUrl.trim() || undefined,
    });
    setSavedName(form.name.trim());
    setForm(initialForm);
    setErrors({});
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {savedName && (
        <div
          role="status"
          className="flex items-center gap-2.5 rounded-xl border border-ink/40 bg-ink/10 px-4 py-3 text-sm text-ink"
        >
          <Ribbon className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>
            <strong className="font-semibold">{savedName}</strong> foi cadastrado com sucesso!
          </span>
        </div>
      )}

      <FormField
        label="Nome do produto"
        name="name"
        required
        icon={Tag}
        value={form.name}
        onChange={(e) => set('name')(e.target.value)}
        error={errors.name}
        placeholder="Ex.: Laço Boutique"
        maxLength={60}
      />

      <FormField
        label="Modelo"
        name="model"
        required
        icon={Ribbon}
        value={form.model}
        onChange={(e) => set('model')(e.target.value)}
        error={errors.model}
        placeholder="Ex.: Modelo clássico"
        maxLength={60}
      />

      <FormField
        kind="textarea"
        label="Descrição"
        name="description"
        icon={FileText}
        value={form.description}
        onChange={(e) => set('description')(e.target.value)}
        placeholder="Conte um pouco sobre o laço, materiais e acabamento..."
        maxLength={400}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          label="Preço"
          name="price"
          required
          icon={Coins}
          type="number"
          prefix="R$"
          min="0.01"
          step="0.01"
          inputMode="decimal"
          value={form.price}
          onChange={(e) => set('price')(e.target.value)}
          error={errors.price}
          placeholder="0,00"
        />
        <FormField
          label="Quantidade disponível"
          name="quantity"
          required
          icon={Boxes}
          type="number"
          min="0"
          step="1"
          inputMode="numeric"
          value={form.quantity}
          onChange={(e) => set('quantity')(e.target.value)}
          error={errors.quantity}
          placeholder="0"
        />
      </div>

      <FormField
        kind="select"
        label="Status"
        name="status"
        icon={Tag}
        value={form.status}
        onChange={(e) => set('status')(e.target.value as ProductStatus)}
        options={[
          { value: 'ativo', label: 'Ativo' },
          { value: 'sob_encomenda', label: 'Sob encomenda' },
          { value: 'indisponivel', label: 'Indisponível' },
        ]}
      />

      <FormField
        label="Imagem (URL)"
        name="imageUrl"
        icon={ImagePlus}
        value={form.imageUrl}
        onChange={(e) => set('imageUrl')(e.target.value)}
        placeholder="https://... (opcional)"
        type="url"
      />

      <div className="flex flex-col sm:flex-row gap-3 pt-1">
        <AppButton type="submit" block className="sm:flex-1">
          Salvar cadastro
        </AppButton>
        <AppButton type="button" variant="secondary" block onClick={onCancel} className="sm:flex-1">
          Cancelar
        </AppButton>
      </div>

      <p className="text-center text-xs text-muted">Valores em reais (BRL)</p>
    </form>
  );
}
