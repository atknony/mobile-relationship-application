import { Easing, makeMutable, withTiming } from 'react-native-reanimated';
import { currentLanguage, setLanguage, type Language } from '@/lib/i18n';
import { LANGUAGE_FADE_IN_MS, LANGUAGE_FADE_OUT_MS } from '@/constants/timing';

/**
 * Opacity of everything under the root navigator. The root layout binds it to
 * the view that wraps the Stack, so one value fades whichever screen is up,
 * pushed panels included. Modals are separate windows and are not reached.
 */
export const appContentOpacity = makeMutable(1);

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

let switching = false;

/**
 * Changes the app language without the snap of every string swapping at once:
 * fade out, change it while nothing is visible, fade back in. With reduced
 * motion on, withTiming completes instantly and this is a plain switch.
 */
export async function switchLanguage(language: Language): Promise<void> {
  if (switching || language === currentLanguage()) return;
  switching = true;
  try {
    appContentOpacity.value = withTiming(0, {
      duration: LANGUAGE_FADE_OUT_MS,
      easing: Easing.in(Easing.quad),
    });
    await wait(LANGUAGE_FADE_OUT_MS);
    await setLanguage(language);
  } finally {
    // Two frames: react-i18next re-renders on the change event, and the new
    // strings have to be committed and drawn before the fade reveals them.
    // In `finally` so a failed switch can never leave the app invisible.
    await nextFrame();
    await nextFrame();
    appContentOpacity.value = withTiming(1, {
      duration: LANGUAGE_FADE_IN_MS,
      easing: Easing.out(Easing.quad),
    });
    switching = false;
  }
}
