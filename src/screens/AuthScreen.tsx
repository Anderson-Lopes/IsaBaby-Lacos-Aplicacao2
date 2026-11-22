import { useState } from 'react';
import { KeyRound, LockKeyhole, Mail, Sparkles } from 'lucide-react';
import { AppButton } from '@/components/ui/AppButton';
import { FormField } from '@/components/ui/FormField';

type AuthMode = 'login' | 'forgot' | 'changePassword';

interface AuthScreenProps {
  configurationError: string | null;
  accessError?: string | null;
  loadingProfile?: boolean;
  passwordRecovery?: boolean;
  mustChangePassword?: boolean;
  changePassword?: boolean;
  onSignIn: (email: string, password: string) => Promise<{ error?: string; message?: string }>;
  onSendPasswordReset: (email: string) => Promise<{ error?: string; message?: string }>;
  onUpdatePassword: (password: string) => Promise<{ error?: string; message?: string }>;
  onSignOut?: () => Promise<{ error?: string }>;
  onCancelPasswordChange?: () => void;
}

export function AuthScreen({
  configurationError,
  accessError,
  loadingProfile = false,
  passwordRecovery = false,
  mustChangePassword = false,
  changePassword = false,
  onSignIn,
  onSendPasswordReset,
  onUpdatePassword,
  onSignOut,
  onCancelPasswordChange,
}: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>(
    passwordRecovery || mustChangePassword || changePassword ? 'changePassword' : 'login'
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const changeMode = (next: AuthMode) => {
    setMode(next);
    setError(null);
    setMessage(null);
    setPassword('');
    setConfirmation('');
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (mode === 'changePassword' && password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.');
      return;
    }
    if (mode === 'changePassword' && password !== confirmation) {
      setError('As senhas não conferem.');
      return;
    }
    setBusy(true);
    let result: { error?: string; message?: string };
    try {
      if (mode === 'login') result = await onSignIn(email.trim(), password);
      else if (mode === 'forgot') result = await onSendPasswordReset(email.trim());
      else result = await onUpdatePassword(password);
    } catch (submitError) {
      setBusy(false);
      setError(submitError instanceof Error ? submitError.message : 'Não foi possível concluir a solicitação.');
      return;
    }
    setBusy(false);
    if (result.error) setError(result.error);
    if (result.message) setMessage(result.message);
    if (mode === 'changePassword' && !result.error && changePassword && onCancelPasswordChange) {
      onCancelPasswordChange();
    }
  };

  const handleSignOut = async () => {
    if (!onSignOut) return;
    setBusy(true);
    try {
      const result = await onSignOut();
      if (result.error) setError(result.error);
    } catch (signOutError) {
      setError(signOutError instanceof Error ? signOutError.message : 'Não foi possível sair da conta.');
    } finally {
      setBusy(false);
    }
  };

  const heading = mode === 'forgot'
      ? 'Recuperar senha'
      : mode === 'changePassword'
        ? mustChangePassword ? 'Defina uma nova senha' : 'Alterar senha'
        : 'Acesso administrativo';

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-3xl bg-surface border border-border p-6 sm:p-8 shadow-lifted">
        <div className="flex flex-col items-center text-center mb-7">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center mb-4">
            <Sparkles className="w-7 h-7 text-primary" aria-hidden="true" />
          </div>
          <h1 className="font-display text-2xl font-semibold text-primary">IsaBaby Laços</h1>
          <p className="text-sm text-muted mt-2">{heading}</p>
        </div>

        {configurationError && (
          <p className="mb-5 rounded-xl border border-accent/40 bg-accent/10 p-3 text-sm text-accent" role="alert">
            {configurationError}
          </p>
        )}
        {accessError && (
          <p className="mb-5 rounded-xl border border-accent/40 bg-accent/10 p-3 text-sm text-accent" role="alert">
            {accessError}
          </p>
        )}
        {loadingProfile && <p className="mb-5 text-sm text-muted" role="status">Verificando permissões da conta...</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode !== 'changePassword' && (
            <FormField
              label="E-mail"
              name="email"
              required
              icon={Mail}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              maxLength={254}
            />
          )}

          {mode === 'login' && (
            <FormField
              label="Senha"
              name="password"
              required
              icon={LockKeyhole}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
            />
          )}

          {mode === 'changePassword' && (
            <>
              <FormField
                label="Nova senha"
                name="password"
                required
                icon={LockKeyhole}
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
              />
              <FormField
                label="Confirme a nova senha"
                name="password-confirmation"
                required
                icon={KeyRound}
                type="password"
                autoComplete="new-password"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                minLength={8}
              />
            </>
          )}

          {error && <p className="text-sm text-primary" role="alert">{error}</p>}
          {message && <p className="text-sm text-ink" role="status">{message}</p>}

          <AppButton type="submit" block disabled={busy || loadingProfile || Boolean(configurationError) || Boolean(accessError)}>
            {busy ? 'Aguarde...' : mode === 'forgot' ? 'Enviar link de recuperação' : mode === 'changePassword' ? 'Salvar nova senha' : 'Entrar'}
          </AppButton>
        </form>

        <div className="flex flex-col items-center gap-3 mt-5 text-sm">
          {onSignOut && (accessError || configurationError) && (
            <button type="button" disabled={busy} className="text-secondary hover:text-primary underline underline-offset-4 disabled:opacity-40"
              onClick={() => void handleSignOut()}>
              Sair e usar outra conta
            </button>
          )}
          {mode === 'login' && (
            <>
              <button type="button" className="text-secondary hover:text-primary underline underline-offset-4" onClick={() => changeMode('forgot')}>
                Esqueci minha senha
              </button>
              <p className="text-xs text-muted text-center">
                Acesso restrito à administração. Clientes podem comprar sem cadastro.
              </p>
              {onCancelPasswordChange && (
                <button type="button" className="text-secondary hover:text-primary underline underline-offset-4" onClick={onCancelPasswordChange}>
                  Voltar ao catálogo
                </button>
              )}
            </>
          )}
          {mode === 'forgot' && (
            <button type="button" className="text-secondary hover:text-primary underline underline-offset-4" onClick={() => changeMode('login')}>
              Voltar para entrar
            </button>
          )}
          {mode === 'changePassword' && !mustChangePassword && !passwordRecovery && onCancelPasswordChange && (
            <button type="button" className="text-secondary hover:text-primary underline underline-offset-4" onClick={onCancelPasswordChange}>
              Cancelar
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
