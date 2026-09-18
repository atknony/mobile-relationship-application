import AsyncStorage from '@react-native-async-storage/async-storage';
import { en } from '@/locales/en';
import { tr } from '@/locales/tr';
import { currentLanguage, i18n, LANGUAGE_KEY, restoreLanguage, setLanguage } from '@/lib/i18n';

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
  const turkish = flatten(tr);

  // The key sets are enforced by the Translation type; placeholders are not.
  it('gives every Turkish string the same placeholders as the English one', () => {
    for (const [key, value] of Object.entries(english)) {
      expect({ key, vars: placeholders(turkish[key]) }).toEqual({ key, vars: placeholders(value) });
    }
  });

  it('has no empty strings', () => {
    for (const [key, value] of Object.entries({ ...english, ...turkish })) {
      expect({ key, empty: value.trim() === '' }).toEqual({ key, empty: false });
    }
  });

  // Hermes has no Intl.PluralRules, which i18next needs for `count`.
  it('never uses a `count` placeholder', () => {
    for (const value of Object.values({ ...english, ...turkish })) {
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
