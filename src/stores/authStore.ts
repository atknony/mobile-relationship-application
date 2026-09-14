import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';

interface AuthState {
  session: Session | null;
  user: User | null;
  sessionLoaded: boolean; // false until first onAuthStateChange fires
  isDemo: boolean;        // dev-only bypass — see src/lib/demoMode.ts

  setSession: (session: Session | null) => void;
  setDemoSession: (session: Session) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  sessionLoaded: false,
  isDemo: false,

  setSession: (session) =>
    set({ session, user: session?.user ?? null, sessionLoaded: true }),

  setDemoSession: (session) =>
    set({ session, user: session.user, sessionLoaded: true, isDemo: true }),

  clearSession: () =>
    set({ session: null, user: null, sessionLoaded: true, isDemo: false }),
}));
