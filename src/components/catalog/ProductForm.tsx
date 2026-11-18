import { useEffect, useRef, useState } from 'react';
import { Boxes, Coins, FileText, ImagePlus, Ribbon, Tag, Trash2 } from 'lucide-react';
import type { Product, ProductImage, ProductStatus } from '@/types';
import type { ProductDraft } from '@/hooks/useShopData';
import { AppButton } from '@/components/ui/AppButton';
import { FormField } from '@/components/ui/FormField';

interface ProductFormProps {
  product?: Product;
  onSave: (
    draft: ProductDraft,
    files: File[],
    productId?: string,
    primaryImageRef?: string,
    removedImageIds?: string[],
  ) => Promise<void>;
  onCancel: () => void;
}

interface UploadedPreview {
  file: File;
  url: string;
}

interface FormState {
  name: string;
  model: string;
  description: string;
  price: string;
  promotionalPrice: string;
  quantity: string;
  status: ProductStatus;
  isActive: boolean;
}

function initialForm(product?: Product): FormState {
  return {
    name: product?.name ?? '',
    model: product?.model ?? '',
    description: product?.description ?? '',
    price: product ? String(product.price) : '',
    promotionalPrice: product?.promotionalPrice ? String(product.promotionalPrice) : '',
    quantity: product ? String(product.quantity) : '',
    status: product?.status ?? 'ativo',
    isActive: product?.isActive ?? true,
  };
}

export function ProductForm({ product, onSave, onCancel }: ProductFormProps) {
  const [form, setForm] = useState(() => initialForm(product));
  const [files, setFiles] = useState<UploadedPreview[]>([]);
  const [removedImages, setRemovedImages] = useState<string[]>([]);
  const [primaryImageRef, setPrimaryImageRef] = useState(
    product?.images.find((image) => image.isPrimary)?.id
      ? `existing:${product.images.find((image) => image.isPrimary)?.id}`
      : ''
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const previewUrls = useRef<string[]>([]);

  useEffect(() => () => previewUrls.current.forEach((url) => URL.revokeObjectURL(url)), []);

  const set = (key: keyof FormState) => (value: string | boolean) => {
    setForm((current) => ({ ...current, [key]: value }));
    setError(null);
  };

  const addFiles = (selected: FileList | null) => {
    if (!selected) return;
    const additions: UploadedPreview[] = [];
    for (const file of Array.from(selected)) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
        setError('Use imagens JPEG, PNG ou WebP de até 5 MB.');
        continue;
      }
      const url = URL.createObjectURL(file);
      previewUrls.current.push(url);
      additions.push({ file, url });
    }
    setFiles((current) => [...current, ...additions]);
  };

  const removeUploadedFile = (index: number) => {
    setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index));
    if (primaryImageRef === `new:${index}`) setPrimaryImageRef('');
    else if (primaryImageRef.startsWith('new:')) {
      const primaryIndex = Number(primaryImageRef.slice(4));
      if (primaryIndex > index) setPrimaryImageRef(`new:${primaryIndex - 1}`);
    }
  };

  const toggleExistingImage = (image: ProductImage) => {
    if (removedImages.includes(image.id)) {
      setRemovedImages((current) => current.filter((id) => id !== image.id));
    } else {
      setRemovedImages((current) => [...current, image.id]);
      if (primaryImageRef === `existing:${image.id}`) setPrimaryImageRef('');
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const price = Number(form.price);
    const promotionalPrice = form.promotionalPrice.trim() ? Number(form.promotionalPrice) : null;
    const quantity = Number(form.quantity);
    if (!form.name.trim() || !form.model.trim()) {
      setError('Informe o nome e o modelo do produto.');
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      setError('O preço deve ser maior que zero.');
      return;
    }
    if (promotionalPrice !== null && (!Number.isFinite(promotionalPrice) || promotionalPrice <= 0 || promotionalPrice >= price)) {
      setError('O preço promocional deve ser maior que zero e menor que o preço normal.');
      return;
    }
    if (!Number.isInteger(quantity) || quantity < 0) {
      setError('A quantidade deve ser um número inteiro igual ou maior que zero.');
      return;
    }
    if (!product && !files.length) {
      setError('Adicione ao menos uma fotografia do produto.');
      return;
    }
    const availableImages = (product?.images ?? []).filter((image) => !removedImages.includes(image.id)).length + files.length;
    if (availableImages && !primaryImageRef && !files.length) {
      setError('Selecione uma fotografia principal.');
      return;
    }

    setBusy(true);
    try {
      await onSave({
        name: form.name.trim(),
        model: form.model.trim(),
        description: form.description.trim(),
        price,
        promotionalPrice,
        quantity,
        status: form.status,
        isActive: form.isActive,
      }, files.map((item) => item.file), product?.id, primaryImageRef || undefined, removedImages);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar o produto.');
    } finally {
      setBusy(false);
    }
  };

  const existingImages = product?.images ?? [];

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          label="Nome do produto"
          name="product-name"
          required
          icon={Tag}
          value={form.name}
          onChange={(event) => set('name')(event.target.value)}
          maxLength={60}
        />
        <FormField
          label="Modelo"
          name="product-model"
          required
          icon={Ribbon}
          value={form.model}
          onChange={(event) => set('model')(event.target.value)}
          maxLength={60}
        />
      </div>
      <FormField
        kind="textarea"
        label="Descrição"
        name="product-description"
        icon={FileText}
        value={form.description}
        onChange={(event) => set('description')(event.target.value)}
        maxLength={1000}
      />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <FormField
          label="Preço"
          name="product-price"
          type="number"
          required
          min="0.01"
          step="0.01"
          prefix="R$"
          icon={Coins}
          value={form.price}
          onChange={(event) => set('price')(event.target.value)}
        />
        <FormField
          label="Preço promocional"
          name="product-promotional-price"
          type="number"
          min="0.01"
          step="0.01"
          prefix="R$"
          icon={Coins}
          value={form.promotionalPrice}
          onChange={(event) => set('promotionalPrice')(event.target.value)}
        />
        <FormField
          label="Estoque"
          name="product-quantity"
          type="number"
          required
          min="0"
          step="1"
          icon={Boxes}
          value={form.quantity}
          onChange={(event) => set('quantity')(event.target.value)}
        />
      </div>
      <FormField
        kind="select"
        label="Disponibilidade"
        name="product-status"
        value={form.status}
        onChange={(event) => set('status')(event.target.value as ProductStatus)}
        options={[
          { value: 'ativo', label: 'Em estoque' },
          { value: 'sob_encomenda', label: 'Sob encomenda' },
          { value: 'indisponivel', label: 'Indisponível' },
        ]}
      />
      <label className="flex items-center gap-2 text-sm text-secondary">
        <input type="checkbox" checked={form.isActive} onChange={(event) => set('isActive')(event.target.checked)} />
        Produto publicado no catálogo
      </label>

      <div>
        <label htmlFor="product-images" className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-secondary">
          <ImagePlus className="h-4 w-4" aria-hidden="true" />
          Fotografias (JPEG, PNG ou WebP; até 5 MB cada)
        </label>
        <input
          id="product-images"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={(event) => { addFiles(event.target.files); event.target.value = ''; }}
          className="input-field"
        />
        {(existingImages.length > 0 || files.length > 0) && (
          <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {existingImages.filter((image) => !removedImages.includes(image.id)).map((image) => (
              <li key={image.id} className="relative overflow-hidden rounded-xl border border-border">
                <img src={image.imageUrl} alt={image.altText} className="aspect-square w-full object-cover" />
                <label className="flex min-h-10 items-center gap-2 px-2 text-xs text-secondary">
                  <input
                    type="radio"
                    name="primary-image"
                    checked={primaryImageRef === `existing:${image.id}`}
                    onChange={() => setPrimaryImageRef(`existing:${image.id}`)}
                  />
                  Principal
                </label>
                <button type="button" onClick={() => toggleExistingImage(image)} aria-label="Remover fotografia" className="absolute right-2 top-2 rounded-lg bg-background/90 p-2 text-primary">
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </li>
            ))}
            {files.map((item, index) => (
              <li key={`${item.file.name}-${index}`} className="relative overflow-hidden rounded-xl border border-border">
                <img src={item.url} alt={`Prévia ${item.file.name}`} className="aspect-square w-full object-cover" />
                <label className="flex min-h-10 items-center gap-2 px-2 text-xs text-secondary">
                  <input
                    type="radio"
                    name="primary-image"
                    checked={primaryImageRef === `new:${index}`}
                    onChange={() => setPrimaryImageRef(`new:${index}`)}
                  />
                  Principal
                </label>
                <button type="button" onClick={() => removeUploadedFile(index)} aria-label="Remover fotografia nova" className="absolute right-2 top-2 rounded-lg bg-background/90 p-2 text-primary">
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {error && <p role="alert" className="text-sm text-primary">{error}</p>}
      <div className="flex flex-col gap-3 sm:flex-row">
        <AppButton type="submit" block disabled={busy} className="sm:flex-1">{busy ? 'Salvando...' : product ? 'Salvar alterações' : 'Cadastrar produto'}</AppButton>
        <AppButton type="button" variant="secondary" block onClick={onCancel} className="sm:flex-1">Cancelar</AppButton>
      </div>
    </form>
  );
}
