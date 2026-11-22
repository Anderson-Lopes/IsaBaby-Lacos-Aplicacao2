import { useState } from 'react';
import { Boxes, Coins, FileText, ImagePlus, Ribbon, Tag } from 'lucide-react';
import type { Product, ProductDraft, ProductStatus } from '@/types';
import { AppButton } from '@/components/ui/AppButton';
import { FormField } from '@/components/ui/FormField';

interface ProductFormProps {
  product?: Product;
  onSave: (data: ProductDraft) => Promise<void>;
  onCancel: () => void;
}

interface FormState {
  name: string;
  model: string;
  description: string;
  category: string;
  price: string;
  quantity: string;
  status: ProductStatus;
  options: string;
}

type FormErrors = Partial<Record<keyof FormState, string>>;

function toOptionLines(product?: Product): string {
  return product?.options.map((option) => `${option.name}: ${option.values.join(', ')}`).join('\n') ?? '';
}

function validateOptions(raw: string): { options?: Product['options']; error?: string } {
  const lines = raw.split('\n').map((line) => line.trim()).filter(Boolean);
  const options = [];
  const names = new Set<string>();

  for (const line of lines) {
    const separator = line.indexOf(':');
    if (separator <= 0) return { error: 'Use o formato “Nome: opção 1, opção 2” em cada linha.' };
    const name = line.slice(0, separator).trim();
    const values = line.slice(separator + 1).split(',').map((value) => value.trim()).filter(Boolean);
    if (!name || values.length === 0) return { error: 'Cada personalização precisa de um nome e ao menos uma opção.' };
    if (names.has(name.toLocaleLowerCase())) return { error: 'Os nomes das personalizações não podem se repetir.' };
    names.add(name.toLocaleLowerCase());
    options.push({ name, values });
  }
  return { options };
}

export function ProductForm({ product, onSave, onCancel }: ProductFormProps) {
  const [form, setForm] = useState<FormState>({
    name: product?.name ?? '',
    model: product?.model ?? '',
    description: product?.description ?? '',
    category: product?.category ?? '',
    price: product ? String(product.price) : '',
    quantity: product ? String(product.quantity) : '0',
    status: product?.status ?? 'ativo',
    options: toOptionLines(product),
  });
  const [imageFile, setImageFile] = useState<File | undefined>();
  const [errors, setErrors] = useState<FormErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (key: keyof FormState) => (value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const validation: FormErrors = {};
    if (!form.name.trim()) validation.name = 'Informe o nome do produto.';
    if (!form.model.trim()) validation.model = 'Informe o modelo do laço.';
    const price = Number(form.price);
    if (!form.price.trim() || !Number.isFinite(price) || price <= 0) validation.price = 'Informe um preço maior que zero.';
    const quantity = Number(form.quantity);
    if (!form.quantity.trim() || !Number.isInteger(quantity) || quantity < 0) validation.quantity = 'Informe uma quantidade inteira não negativa.';
    const parsedOptions = validateOptions(form.options);
    if (parsedOptions.error) validation.options = parsedOptions.error;
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return;
    }

    setBusy(true);
    try {
      await onSave({
        name: form.name.trim(),
        model: form.model.trim(),
        description: form.description.trim(),
        category: form.category.trim() || null,
        price,
        quantity,
        status: form.status,
        imageUrl: product?.imageUrl,
        imageFile,
        options: parsedOptions.options ?? [],
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Não foi possível salvar o produto.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={(event) => void handleSubmit(event)} noValidate className="space-y-5">
      {error && <p role="alert" className="rounded-xl border border-primary/40 bg-primary/10 p-3 text-sm text-primary">{error}</p>}

      <FormField label="Nome do produto" name="name" required icon={Tag} value={form.name}
        onChange={(event) => set('name')(event.target.value)} error={errors.name} maxLength={60} />
      <FormField label="Modelo" name="model" required icon={Ribbon} value={form.model}
        onChange={(event) => set('model')(event.target.value)} error={errors.model} maxLength={60} />
      <FormField kind="textarea" label="Descrição" name="description" icon={FileText} value={form.description}
        onChange={(event) => set('description')(event.target.value)} maxLength={400} />
      <FormField label="Categoria" name="category" icon={Tag} value={form.category}
        onChange={(event) => set('category')(event.target.value)} maxLength={60} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Preço" name="price" required icon={Coins} type="number" prefix="R$"
          min="0.01" step="0.01" inputMode="decimal" value={form.price}
          onChange={(event) => set('price')(event.target.value)} error={errors.price} />
        <FormField label="Quantidade disponível" name="quantity" required icon={Boxes} type="number"
          min="0" step="1" inputMode="numeric" value={form.quantity}
          onChange={(event) => set('quantity')(event.target.value)} error={errors.quantity} />
      </div>

      <FormField kind="select" label="Disponibilidade" name="status" icon={Tag} value={form.status}
        onChange={(event) => set('status')(event.target.value as ProductStatus)}
        options={[
          { value: 'ativo', label: 'Disponível' },
          { value: 'sob_encomenda', label: 'Sob encomenda' },
          { value: 'indisponivel', label: 'Indisponível' },
        ]} />

      <div>
        <label htmlFor="product-options" className="block text-xs font-semibold text-secondary mb-2">
          Personalizações disponíveis
        </label>
        <textarea id="product-options" value={form.options} onChange={(event) => set('options')(event.target.value)}
          placeholder={'Uma opção por linha. Exemplo de formato: Nome: opção 1, opção 2'}
          className="input-field min-h-[100px] resize-y" aria-invalid={Boolean(errors.options)} />
        {errors.options && <p className="mt-1 text-xs text-primary" role="alert">{errors.options}</p>}
      </div>

      <div>
        <label htmlFor="product-image" className="block text-xs font-semibold text-secondary mb-2">
          <span className="inline-flex items-center gap-1.5"><ImagePlus className="w-4 h-4" /> Foto do produto</span>
        </label>
        <input id="product-image" type="file" accept="image/*"
          onChange={(event) => setImageFile(event.target.files?.[0])}
          className="input-field file:mr-3 file:border-0 file:bg-transparent file:text-primary" />
        <p className="mt-1 text-xs text-muted">
          {imageFile?.name ?? (product?.imageUrl ? 'Envie outra imagem para substituir a atual.' : 'Envie uma imagem de até 5 MB.')}
        </p>
        {product?.imageUrl && !imageFile && <img src={product.imageUrl} alt="" className="mt-3 h-24 w-24 rounded-xl object-cover" />}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-1">
        <AppButton type="submit" block disabled={busy} className="sm:flex-1">
          {busy ? 'Salvando...' : product ? 'Salvar alterações' : 'Cadastrar produto'}
        </AppButton>
        <AppButton type="button" variant="secondary" block onClick={onCancel} className="sm:flex-1">Cancelar</AppButton>
      </div>
      <p className="text-center text-xs text-muted">Valores em reais (BRL)</p>
    </form>
  );
}
