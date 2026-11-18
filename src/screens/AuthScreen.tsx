import { useState } from 'react';
import { KeyRound, LogIn, UserPlus } from 'lucide-react';
import { AppButton } from '@/components/ui/AppButton';
import { FormField } from '@/components/ui/FormField';
import { useAuth } from '@/hooks/useAuth';

type AuthMode = 'login' | 'signup' | 'recovery';

export function AuthScreen({ onBack }: { onBack: () => void }) {
  const { signIn, signUp, sendPasswordReset } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (mode === 'signup') {
      if (fullName.trim().length < 2) {
        setError('Informe seu nome completo.');
        return;
      }
      if (password.length < 10) {
        setError('A senha deve ter pelo menos 10 caracteres.');
        return;
      }
      if (password !== confirmPassword) {
        setError('As senhas não conferem.');
        return;
      }
    }

    setBusy(true);
    try {
      if (mode === 'login') {
        await signIn(email.trim(), password);
        onBack();
      } else if (mode === 'signup') {
        const signedIn = await signUp({ email: email.trim(), password, fullName: fullName.trim(), phone: phone.trim() });
        setNotice(signedIn
          ? 'Conta criada com sucesso.'
          : 'Cadastro recebido. Verifique seu e-mail para confirmar a conta.');
        if (signedIn) onBack();
      } else {
        await sendPasswordReset(email.trim());
        setNotice('Se o endereço estiver cadastrado, você receberá um link para redefinir a senha.');
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível concluir a operação.');
    } finally {
      setBusy(false);
    }
  };

  const title = mode === 'login' ? 'Entrar na sua conta' : mode === 'signup' ? 'Criar conta de cliente' : 'Recuperar senha';

  return (
    <section aria-labelledby="auth-title" className="mx-auto max-w-md space-y-5">
      <button type="button" onClick={onBack} className="min-h-[44px] text-sm text-secondary hover:text-primary">
        &larr; Voltar ao catálogo
      </button>
      <div className="rounded-2xl bg-surface border border-border p-5 sm:p-7 shadow-soft">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-background text-primary">
            {mode === 'login' ? <LogIn aria-hidden="true" /> : mode === 'signup' ? <UserPlus aria-hidden="true" /> : <KeyRound aria-hidden="true" />}
          </div>
          <div>
            <h2 id="auth-title" className="font-display text-xl font-semibold text-primary">{title}</h2>
            <p className="text-xs text-muted">O cadastro público cria somente contas de cliente.</p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === 'signup' && (
            <>
              <FormField
                label="Nome completo"
                name="full-name"
                required
                autoComplete="name"
                maxLength={120}
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
              />
              <FormField
                label="Telefone"
                name="phone"
                type="tel"
                autoComplete="tel"
                maxLength={30}
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
            </>
          )}
          <FormField
            label="E-mail"
            name="email"
            type="email"
            required
            autoComplete="email"
            maxLength={254}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          {mode !== 'recovery' && (
            <>
              <FormField
                label="Senha"
                name="password"
                type="password"
                required
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                minLength={10}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              {mode === 'signup' && (
                <FormField
                  label="Confirmar senha"
                  name="confirm-password"
                  type="password"
                  required
                  autoComplete="new-password"
                  minLength={10}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              )}
            </>
          )}

          {error && <p role="alert" className="text-sm text-primary">{error}</p>}
          {notice && <p role="status" className="text-sm text-ink">{notice}</p>}

          <AppButton type="submit" block disabled={busy}>
            {busy ? 'Aguarde...' : mode === 'login' ? 'Entrar' : mode === 'signup' ? 'Criar minha conta' : 'Enviar link de recuperação'}
          </AppButton>
        </form>

        <div className="mt-4 flex flex-wrap justify-between gap-3 text-xs">
          {mode !== 'recovery' && (
            <button type="button" className="text-secondary hover:text-primary" onClick={() => { setError(null); setNotice(null); setMode(mode === 'login' ? 'signup' : 'login'); }}>
              {mode === 'login' ? 'Criar minha conta' : 'Já tenho uma conta'}
            </button>
          )}
          {mode !== 'signup' && (
            <button type="button" className="text-secondary hover:text-primary" onClick={() => { setError(null); setNotice(null); setMode(mode === 'recovery' ? 'login' : 'recovery'); }}>
              {mode === 'recovery' ? 'Voltar ao login' : 'Esqueci minha senha'}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
