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
}

export const useAppStore = create<AppState>((set) => ({
  isRevealed: false,
  setRevealed: (isRevealed) => set({ isRevealed }),
}));
