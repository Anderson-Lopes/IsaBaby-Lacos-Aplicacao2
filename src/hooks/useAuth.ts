import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export interface UserProfile {
  id: string;
  username: string;
  role: 'admin' | 'customer';
  must_change_password: boolean;
}

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  passwordRecovery: boolean;
  configurationError: string | null;
}

type AuthResult = { error?: string; message?: string };

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
    passwordRecovery: false,
    configurationError: null,
  });

  useEffect(() => {
    const client = supabase;
    if (!client) {
      setState((current) => ({
        ...current,
        loading: false,
        configurationError: 'O acesso ainda não foi configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.',
      }));
      return;
    }

    let active = true;

    const loadProfile = async (user: User | null) => {
      if (!user) {
        if (active) setState((current) => ({
          ...current,
          user: null,
          profile: null,
          loading: false,
          passwordRecovery: false,
          configurationError: null,
        }));
        return;
      }

      if (active) setState((current) => ({ ...current, user, loading: true }));
      const { data, error } = await client
        .from('profiles')
        .select('id, username, role, must_change_password')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        if (active) setState((current) => ({ ...current, user, profile: null, loading: false, configurationError: error.message }));
        return;
      }

      if (data) {
        if (active) setState((current) => ({ ...current, user, profile: data as UserProfile, loading: false, configurationError: null }));
        return;
      }

      if (active) {
        setState((current) => ({
          ...current,
          user,
          profile: null,
          loading: false,
          configurationError: 'Esta conta não possui um perfil administrativo autorizado.',
        }));
      }
    };

    const initialize = async () => {
      const { data, error } = await client.auth.getSession();
      if (!active) return;
      if (error) {
        setState((current) => ({ ...current, loading: false, configurationError: error.message }));
        return;
      }
      await loadProfile(data.session?.user ?? null);
    };

    void initialize();
    const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && active) {
        setState((current) => ({ ...current, passwordRecovery: true }));
      }
      window.setTimeout(() => void loadProfile(session?.user ?? null), 0);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string): Promise<AuthResult> => {
    if (!supabase) return { error: 'Supabase não está configurado.' };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? { error: error.message } : {};
  };

  const sendPasswordReset = async (email: string): Promise<AuthResult> => {
    if (!supabase) return { error: 'Supabase não está configurado.' };
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    return error
      ? { error: error.message }
      : { message: 'Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha.' };
  };

  const updatePassword = async (password: string): Promise<AuthResult> => {
    if (!supabase) return { error: 'Supabase não está configurado.' };
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { error: error.message };

    if (state.profile?.must_change_password) {
      const { error: setupError } = await supabase.rpc('complete_password_setup');
      if (setupError) return { error: `Senha alterada, mas não foi possível concluir a configuração da conta: ${setupError.message}` };
    }

    setState((current) => ({
      ...current,
      passwordRecovery: false,
      profile: current.profile ? { ...current.profile, must_change_password: false } : null,
    }));
    return { message: 'Senha alterada com sucesso.' };
  };

  const signOut = async (): Promise<AuthResult> => {
    if (!supabase) return { error: 'Supabase não está configurado.' };
    const { error } = await supabase.auth.signOut();
    return error ? { error: error.message } : {};
  };

  return { ...state, signIn, sendPasswordReset, updatePassword, signOut };
}
