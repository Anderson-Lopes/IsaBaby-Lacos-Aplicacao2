import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { AppButton } from '@/components/ui/AppButton';
import { FormField } from '@/components/ui/FormField';

interface ChangePasswordScreenProps {
  onChangePassword: (password: string) => Promise<void>;
  onSignOut: () => Promise<void>;
  onComplete: () => void;
}

export function ChangePasswordScreen({ onChangePassword, onSignOut, onComplete }: ChangePasswordScreenProps) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (password.length < 10) {
      setError('A senha deve ter pelo menos 10 caracteres.');
      return;
    }
    if (password !== confirmation) {
      setError('As senhas não conferem.');
      return;
    }
    setBusy(true);
    try {
      await onChangePassword(password);
      onComplete();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível atualizar a senha.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mx-auto max-w-md rounded-2xl bg-surface border border-border p-5 sm:p-7 shadow-soft">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-background text-primary">
          <KeyRound aria-hidden="true" />
        </div>
        <div>
          <h2 className="font-display text-xl font-semibold text-primary">Atualize sua senha</h2>
          <p className="text-xs text-muted">Defina uma senha nova para continuar.</p>
        </div>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <FormField
          label="Nova senha"
          name="new-password"
          type="password"
          required
          minLength={10}
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <FormField
          label="Confirmar senha"
          name="confirm-password"
          type="password"
          required
          minLength={10}
          autoComplete="new-password"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
        />
        {error && <p role="alert" className="text-sm text-primary">{error}</p>}
        <AppButton type="submit" block disabled={busy}>{busy ? 'Salvando...' : 'Salvar nova senha'}</AppButton>
        <AppButton type="button" variant="secondary" block onClick={() => void onSignOut().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Não foi possível sair da conta.'))}>Sair</AppButton>
      </form>
    </section>
  );
}
