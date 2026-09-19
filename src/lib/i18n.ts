import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { en } from '@/locales/en';
import { tr } from '@/locales/tr';
import { es } from '@/locales/es';
import { zh } from '@/locales/zh';

// The order the language sheet lists them in. `zh` is Simplified Chinese.
export const LANGUAGES = ['en', 'tr', 'es', 'zh'] as const;
export type Language = (typeof LANGUAGES)[number];

/**
 * Each language named in itself, whatever the app is currently in — someone
 * who opened the sheet by mistake in a language they cannot read still finds
 * their own. Never translated, so these are not in the locale files.
 */
export const LANGUAGE_NAMES: Record<Language, string> = {
  en: 'English',
  tr: 'Türkçe',
  es: 'Español',
  zh: '中文',
};

export const LANGUAGE_KEY = 'imm:language';

declare module 'i18next' {
  interface CustomTypeOptions {
    resources: { translation: typeof en };
  }
}

/**
 * The phone's language, read through Hermes' Intl rather than expo-localization:
 * that is a native module, and adding one would have meant rebuilding the
 * development client on both phones for a single string.
 */
function deviceLanguage(): Language {
  try {
    const primary = Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase().split('-')[0];
    return toLanguage(primary);
  } catch {
    return 'en';
  }
}

function isLanguage(value: string | null | undefined): value is Language {
  return (LANGUAGES as readonly string[]).includes(value ?? '');
}

function toLanguage(value: string | null | undefined): Language {
  return isLanguage(value) ? value : 'en';
}

// Its own instance rather than the i18next default export, so nothing else in
// the bundle can reconfigure it. initReactI18next hands it to useTranslation.
const i18n = createInstance();

// Synchronous (resources inline, initAsync off), so the very first render
// already has strings. It starts in the phone's language; a choice made in
// Settings is applied by restoreLanguage() while the splash is still up.
void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    tr: { translation: tr },
    es: { translation: es },
    zh: { translation: zh },
  },
  lng: deviceLanguage(),
  fallbackLng: 'en',
  supportedLngs: LANGUAGES,
  interpolation: { escapeValue: false }, // React escapes already
  initAsync: false,
});

export function currentLanguage(): Language {
  return toLanguage(i18n.resolvedLanguage);
}

/** Applies the language chosen in Settings, if any. Never rejects. */
export async function restoreLanguage(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (isLanguage(stored) && stored !== i18n.language) {
      await i18n.changeLanguage(stored);
    }
  } catch {
    // The phone's language is a fine answer.
  }
}

/**
 * A property of this phone, like vibrate-on-arrival — so it survives sign-out.
 * The profile row gets a copy (useProfileLocale) only so pushes, which are
 * written on the sender's server call, reach this person in their language.
 */
export async function setLanguage(language: Language): Promise<void> {
  await i18n.changeLanguage(language);
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, language);
  } catch {
    // Applied for this session either way.
  }
}

export { i18n };
