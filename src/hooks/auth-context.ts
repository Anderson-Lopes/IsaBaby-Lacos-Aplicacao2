import { createContext } from 'react';
import type { User } from '@supabase/supabase-js';
import type { UserProfile } from '@/types';

export interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  passwordRecovery: boolean;
  error: string | null;
  clearError: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: { email: string; password: string; fullName: string; phone: string }) => Promise<boolean>;
  sendPasswordReset: (email: string) => Promise<void>;
  changePassword: (password: string) => Promise<void>;
  updateProfile: (input: { fullName: string; phone: string }) => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
