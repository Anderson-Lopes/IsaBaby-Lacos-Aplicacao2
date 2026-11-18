import { useState } from 'react';
import { MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import type { Address, UserProfile } from '@/types';
import type { AddressDraft } from '@/hooks/useShopData';
import { AppButton } from '@/components/ui/AppButton';
import { FormField } from '@/components/ui/FormField';

interface AccountScreenProps {
  profile: UserProfile;
  addresses: Address[];
  onUpdateProfile: (input: { fullName: string; phone: string }) => Promise<void>;
  onSaveAddress: (input: AddressDraft, addressId?: string) => Promise<void>;
  onDeleteAddress: (addressId: string) => Promise<void>;
  onSetDefaultAddress: (addressId: string) => Promise<void>;
  onChangePassword: () => void;
}

const emptyAddress: AddressDraft = {
  recipientName: '',
  postalCode: '',
  state: '',
  city: '',
  district: '',
  street: '',
  number: '',
  complement: '',
  reference: '',
  isDefault: false,
};

export function AccountScreen({ profile, addresses, onUpdateProfile, onSaveAddress, onDeleteAddress, onSetDefaultAddress, onChangePassword }: AccountScreenProps) {
  const [fullName, setFullName] = useState(profile.fullName);
  const [phone, setPhone] = useState(profile.phone);
  const [address, setAddress] = useState<AddressDraft | null>(null);
  const [editingId, setEditingId] = useState<string | undefined>();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const updateAddress = (key: keyof AddressDraft, value: string | boolean) => {
    setAddress((current) => current ? { ...current, [key]: value } : current);
  };

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await onUpdateProfile({ fullName, phone });
      setMessage('Dados pessoais atualizados.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível atualizar o perfil.');
    } finally {
      setBusy(false);
    }
  };

  const saveAddress = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!address) return;
    setError(null);
    if (address.postalCode.replace(/\D/g, '').length !== 8) {
      setError('O CEP deve conter 8 números.');
      return;
    }
    if (!address.recipientName.trim() || !address.state.trim() || !address.city.trim()
      || !address.district.trim() || !address.street.trim() || !address.number.trim()) {
      setError('Preencha os campos obrigatórios do endereço.');
      return;
    }
    setBusy(true);
    try {
      await onSaveAddress(address, editingId);
      setAddress(null);
      setEditingId(undefined);
      setMessage('Endereço salvo.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar o endereço.');
    } finally {
      setBusy(false);
    }
  };

  const beginEdit = (item: Address) => {
    setEditingId(item.id);
    setAddress({ ...item });
    setError(null);
  };

  const removeAddress = async (id: string) => {
    if (!window.confirm('Remover este endereço?')) return;
    setError(null);
    try {
      await onDeleteAddress(id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível remover o endereço.');
    }
  };

  return (
    <section aria-labelledby="account-title" className="space-y-6">
      <div>
        <h2 id="account-title" className="font-display text-xl font-semibold text-primary">Minha conta</h2>
        <p className="text-xs text-muted">Atualize seus dados e endereços de entrega.</p>
      </div>
      <form onSubmit={saveProfile} className="space-y-4 rounded-2xl border border-border bg-surface p-4 sm:p-5">
        <h3 className="text-sm font-semibold text-primary">Dados pessoais</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Nome completo" name="account-name" required maxLength={120} value={fullName} onChange={(event) => setFullName(event.target.value)} />
          <FormField label="Telefone" name="account-phone" type="tel" maxLength={30} value={phone} onChange={(event) => setPhone(event.target.value)} />
        </div>
        <FormField label="E-mail" name="account-email" type="email" value={profile.email} readOnly />
        <div className="flex flex-wrap gap-3">
          <AppButton type="submit" disabled={busy}>{busy ? 'Salvando...' : 'Salvar dados'}</AppButton>
          <AppButton type="button" variant="secondary" onClick={onChangePassword}>Alterar senha</AppButton>
        </div>
      </form>

      <div className="space-y-3 rounded-2xl border border-border bg-surface p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-primary">Endereços de entrega</h3>
            <p className="text-xs text-muted">O pedido salva uma cópia do endereço escolhido.</p>
          </div>
          {!address && (
            <AppButton type="button" icon={Plus} variant="secondary" onClick={() => { setAddress({ ...emptyAddress }); setEditingId(undefined); }}>
              Adicionar
            </AppButton>
          )}
        </div>
        {addresses.length === 0 && !address && <p className="text-sm text-muted">Nenhum endereço cadastrado.</p>}
        <ul className="space-y-3">
          {addresses.map((item) => (
            <li key={item.id} className="rounded-xl border border-border p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-secondary" aria-hidden="true" />
                  <div className="text-sm">
                    <p className="font-semibold text-ink">{item.recipientName}{item.isDefault ? ' · Principal' : ''}</p>
                    <p className="text-muted">{item.street}, {item.number}{item.complement ? `, ${item.complement}` : ''}</p>
                    <p className="text-muted">{item.district}, {item.city} - {item.state}, CEP {item.postalCode}</p>
                    {item.reference && <p className="text-xs text-muted">Referência: {item.reference}</p>}
                  </div>
                </div>
                <div className="flex gap-1">
                  {!item.isDefault && <button type="button" onClick={() => void onSetDefaultAddress(item.id).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Falha ao selecionar endereço.'))} className="min-h-10 px-2 text-xs text-secondary">Tornar principal</button>}
                  <button type="button" onClick={() => beginEdit(item)} aria-label="Editar endereço" className="min-h-10 min-w-10 rounded-lg text-secondary hover:bg-background"><Pencil className="mx-auto h-4 w-4" aria-hidden="true" /></button>
                  <button type="button" onClick={() => void removeAddress(item.id)} aria-label="Remover endereço" className="min-h-10 min-w-10 rounded-lg text-primary hover:bg-background"><Trash2 className="mx-auto h-4 w-4" aria-hidden="true" /></button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        {address && (
          <form onSubmit={saveAddress} className="space-y-4 border-t border-border pt-4">
            <h4 className="text-sm font-semibold text-primary">{editingId ? 'Editar endereço' : 'Novo endereço'}</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Destinatário" name="recipient" required maxLength={120} value={address.recipientName} onChange={(event) => updateAddress('recipientName', event.target.value)} />
              <FormField label="CEP" name="postal-code" required inputMode="numeric" maxLength={9} value={address.postalCode} onChange={(event) => updateAddress('postalCode', event.target.value)} />
              <FormField label="Estado (UF)" name="state" required maxLength={2} value={address.state} onChange={(event) => updateAddress('state', event.target.value)} />
              <FormField label="Cidade" name="city" required maxLength={100} value={address.city} onChange={(event) => updateAddress('city', event.target.value)} />
              <FormField label="Bairro" name="district" required maxLength={100} value={address.district} onChange={(event) => updateAddress('district', event.target.value)} />
              <FormField label="Rua" name="street" required maxLength={150} value={address.street} onChange={(event) => updateAddress('street', event.target.value)} />
              <FormField label="Número" name="number" required maxLength={20} value={address.number} onChange={(event) => updateAddress('number', event.target.value)} />
              <FormField label="Complemento" name="complement" maxLength={120} value={address.complement} onChange={(event) => updateAddress('complement', event.target.value)} />
              <FormField label="Referência" name="reference" maxLength={200} value={address.reference} onChange={(event) => updateAddress('reference', event.target.value)} />
            </div>
            <label className="flex items-center gap-2 text-sm text-secondary">
              <input type="checkbox" checked={address.isDefault} onChange={(event) => updateAddress('isDefault', event.target.checked)} />
              Definir como endereço principal
            </label>
            <div className="flex gap-3">
              <AppButton type="submit" disabled={busy}>{busy ? 'Salvando...' : 'Salvar endereço'}</AppButton>
              <AppButton type="button" variant="secondary" onClick={() => { setAddress(null); setEditingId(undefined); }}>Cancelar</AppButton>
            </div>
          </form>
        )}
      </div>
      {message && <p role="status" className="text-sm text-ink">{message}</p>}
      {error && <p role="alert" className="text-sm text-primary">{error}</p>}
    </section>
  );
}
