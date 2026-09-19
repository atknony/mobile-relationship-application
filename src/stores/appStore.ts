import { create } from 'zustand';

interface AppState {
  /**
   * False while the root layout is still deciding which route group this
   * session belongs in, and the startup cover is up.
   *
   * The cover hides the screen, not the device. A keyboard is a system window
   * and draws over it, so an input that autofocuses on a screen the guard is
   * about to replace still pops the keyboard at launch — visible even though
   * the screen behind it is not. Anything that takes focus must wait for this.
   *
   * Written only by `RootNavigator`; everything else reads it.
   */
  isRevealed: boolean;
  setRevealed: (revealed: boolean) => void;

  /**
   * Set when this phone was signed out because the account signed in on
   * another one (`lib/activeDevice.ts`). Read once by `useActiveDevice` to
   * explain the sign-out, then cleared — without it the phone would simply
   * drop to the login screen for no visible reason.
   */
  sessionReplaced: boolean;
  setSessionReplaced: (replaced: boolean) => void;

  /**
   * (home) has decided whether a newly formed pair is celebrated. Until then it
   * covers Home, so the root layout keeps the splash up on a launch into
   * (home) rather than lifting it onto that blank cover. Written only by
   * (home)/_layout.tsx.
   */
  celebrationDecided: boolean;
  setCelebrationDecided: (decided: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  isRevealed: false,
  setRevealed: (isRevealed) => set({ isRevealed }),
  sessionReplaced: false,
  setSessionReplaced: (sessionReplaced) => set({ sessionReplaced }),
  celebrationDecided: false,
  setCelebrationDecided: (celebrationDecided) => set({ celebrationDecided }),
}));
