import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';

interface AuthState {
  session: Session | null;
  user: User | null;
  sessionLoaded: boolean; // false until first onAuthStateChange fires

  setSession: (session: Session | null) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  sessionLoaded: false,

  setSession: (session) =>
    set({ session, user: session?.user ?? null, sessionLoaded: true }),

  clearSession: () =>
    set({ session: null, user: null, sessionLoaded: true }),
}));
