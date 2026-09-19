import AsyncStorage from '@react-native-async-storage/async-storage';
import { en } from '@/locales/en';
import { tr } from '@/locales/tr';
import { es } from '@/locales/es';
import { zh } from '@/locales/zh';
import {
  currentLanguage,
  i18n,
  LANGUAGE_KEY,
  LANGUAGE_NAMES,
  LANGUAGES,
  restoreLanguage,
  setLanguage,
} from '@/lib/i18n';

type Tree = { [key: string]: string | Tree };

function flatten(tree: Tree, prefix = ''): Record<string, string> {
  return Object.entries(tree).reduce<Record<string, string>>((out, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === 'string' ? { ...out, [path]: value } : { ...out, ...flatten(value, path) };
  }, {});
}

const placeholders = (s: string) => (s.match(/\{\{\s*\w+\s*\}\}/g) ?? []).sort();

describe('locale files', () => {
  const english = flatten(en);
  const translations = { tr: flatten(tr), es: flatten(es), zh: flatten(zh) };
  const everyString = Object.entries(translations).flatMap(([lng, strings]) =>
    Object.entries(strings).map(([key, value]) => ({ lng, key, value }))
  );

  it('registers every language with its own name', () => {
    expect(Object.keys(LANGUAGE_NAMES).sort()).toEqual([...LANGUAGES].sort());
    expect(Object.keys(translations).sort()).toEqual(LANGUAGES.filter((l) => l !== 'en').sort());
  });

  // The key sets are enforced by the Translation type; placeholders are not.
  it('gives every translated string the same placeholders as the English one', () => {
    for (const [lng, strings] of Object.entries(translations)) {
      for (const [key, value] of Object.entries(english)) {
        expect({ lng, key, vars: placeholders(strings[key]) }).toEqual({
          lng,
          key,
          vars: placeholders(value),
        });
      }
    }
  });

  it('has no empty strings', () => {
    for (const { lng, key, value } of everyString) {
      expect({ lng, key, empty: value.trim() === '' }).toEqual({ lng, key, empty: false });
    }
  });

  // Hermes has no Intl.PluralRules, which i18next needs for `count`.
  it('never uses a `count` placeholder', () => {
    for (const value of [...Object.values(english), ...everyString.map((s) => s.value)]) {
      expect(value).not.toMatch(/\{\{\s*count\s*\}\}/);
    }
  });
});

describe('language switching', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await i18n.changeLanguage('en');
  });

  it('translates and interpolates in the chosen language', async () => {
    expect(i18n.t('pings.notificationTitle', { name: 'Deniz' })).toBe('Deniz is thinking of you');
    await setLanguage('tr');
    expect(currentLanguage()).toBe('tr');
    expect(i18n.t('pings.notificationTitle', { name: 'Deniz' })).toBe('Deniz seni düşünüyor');
    await setLanguage('es');
    expect(i18n.t('pings.notificationTitle', { name: 'Deniz' })).toBe('Deniz está pensando en ti');
    await setLanguage('zh');
    expect(currentLanguage()).toBe('zh');
    expect(i18n.t('pings.notificationTitle', { name: 'Deniz' })).toBe('Deniz 正在想你');
  });

  it('persists the choice and restores it on the next launch', async () => {
    await setLanguage('tr');
    expect(await AsyncStorage.getItem(LANGUAGE_KEY)).toBe('tr');

    await i18n.changeLanguage('en'); // a fresh launch starts in the phone's language
    await restoreLanguage();
    expect(currentLanguage()).toBe('tr');
  });

  it('ignores a stored value it does not know', async () => {
    await AsyncStorage.setItem(LANGUAGE_KEY, 'xx');
    await restoreLanguage();
    expect(currentLanguage()).toBe('en');
  });
});
