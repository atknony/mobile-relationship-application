import { currentLanguage, i18n } from '@/lib/i18n';
import { appContentOpacity, switchLanguage } from '@/lib/languageTransition';
import { LANGUAGE_FADE_IN_MS } from '@/constants/timing';

// switchLanguage resolves as the fade-in *starts*; let it run to the end.
const fadeInDone = () => new Promise((resolve) => setTimeout(resolve, LANGUAGE_FADE_IN_MS + 100));

describe('switchLanguage', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('changes the language and leaves the app visible', async () => {
    await switchLanguage('tr');
    expect(currentLanguage()).toBe('tr');
    await fadeInDone();
    expect(appContentOpacity.value).toBe(1);
  });

  it('does not change the language until the app has faded out', async () => {
    const pending = switchLanguage('tr');
    expect(currentLanguage()).toBe('en');
    await pending;
    expect(currentLanguage()).toBe('tr');
  });

  it('ignores a second choice made while one is still switching', async () => {
    const spy = jest.spyOn(i18n, 'changeLanguage');
    await Promise.all([switchLanguage('tr'), switchLanguage('tr')]);
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it('restores visibility even if the change fails', async () => {
    const spy = jest.spyOn(i18n, 'changeLanguage').mockRejectedValueOnce(new Error('boom'));
    await expect(switchLanguage('tr')).rejects.toThrow('boom');
    await fadeInDone();
    expect(appContentOpacity.value).toBe(1);
    spy.mockRestore();
  });
});
