import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { UserProfile } from '@/types';
import { AuthContext, type AuthContextValue } from '@/hooks/auth-context';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) throw new Error('Supabase is not configured.');
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') setLoading(true);
      if (event === 'SIGNED_OUT' || (event === 'INITIAL_SESSION' && !nextSession)) setLoading(false);
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true);
      if (event === 'SIGNED_OUT') {
        setProfile(null);
        setPasswordRecovery(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const refreshProfile = useCallback(async (userId: string) => {
    if (!supabase) throw new Error('Supabase is not configured.');
    const { data, error: queryError } = await supabase
      .from('profiles')
      .select('id, username, email, full_name, phone, role, must_change_password, account_status')
      .eq('id', userId)
      .single();
    if (queryError) throw queryError;

    setProfile({
      id: data.id,
      username: data.username,
      email: data.email ?? '',
      fullName: data.full_name,
      phone: data.phone ?? '',
      role: data.role,
      mustChangePassword: data.must_change_password,
      accountStatus: data.account_status,
    });
  }, []);

  const sessionUserId = session?.user.id;

  useEffect(() => {
    let active = true;
    if (!sessionUserId) {
      setProfile(null);
      setLoading(false);
      return () => { active = false; };
    }

    setLoading(true);
    refreshProfile(sessionUserId)
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Não foi possível carregar seu perfil.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [sessionUserId, refreshProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase is not configured.');
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) throw authError;
    setError(null);
  }, []);

  const signUp = useCallback(async (input: {
    email: string;
    password: string;
    fullName: string;
    phone: string;
  }) => {
    if (!supabase) throw new Error('Supabase is not configured.');
    const { data, error: authError } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: {
          username: input.email.trim().toLowerCase(),
          full_name: input.fullName,
          phone: input.phone,
        },
      },
    });
    if (authError) throw authError;
    setError(null);
    return Boolean(data.session);
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    if (!supabase) throw new Error('Supabase is not configured.');
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    if (resetError) throw resetError;
  }, []);

  const changePassword = useCallback(async (password: string) => {
    if (!supabase) throw new Error('Supabase is not configured.');
    const { error: authError } = await supabase.auth.updateUser({ password });
    if (authError) throw authError;
    const { error: rpcError } = await supabase.rpc('complete_password_change');
    if (rpcError) throw rpcError;
    if (session?.user) await refreshProfile(session.user.id);
    setPasswordRecovery(false);
  }, [refreshProfile, session?.user]);

  const updateProfile = useCallback(async (input: { fullName: string; phone: string }) => {
    if (!supabase || !session?.user) throw new Error('Entre na sua conta para atualizar o perfil.');
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ full_name: input.fullName.trim(), phone: input.phone.trim() || null })
      .eq('id', session.user.id);
    if (updateError) throw updateError;
    await refreshProfile(session.user.id);
  }, [refreshProfile, session?.user]);

  const signOut = useCallback(async () => {
    if (!supabase) throw new Error('Supabase is not configured.');
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) throw signOutError;
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user: session?.user ?? null,
    profile,
    loading,
    passwordRecovery,
    error,
    clearError: () => setError(null),
    signIn,
    signUp,
    sendPasswordReset,
    changePassword,
    updateProfile,
    signOut,
  }), [
    session?.user,
    profile,
    loading,
    passwordRecovery,
    error,
    signIn,
    signUp,
    sendPasswordReset,
    changePassword,
    updateProfile,
    signOut,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

