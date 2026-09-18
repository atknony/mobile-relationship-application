import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { currentLanguage } from '@/lib/i18n';
import { useProfileStore } from '@/stores/profileStore';

/**
 * Copies this phone's app language onto the profile row, where `send-ping`
 * reads it to write the partner's pushes in *their* language — a push is built
 * on the sender's request, so the server has no other way to know.
 *
 * Runs on launch and on every change in Settings. Best effort: a failed write
 * only means the next push arrives in the previous language, and the effect
 * retries the next time the profile or language changes.
 */
export function useProfileLocale() {
  // Subscribes this hook to language changes, so `language` below is current.
  useTranslation();
  const userId = useProfileStore((s) => s.ownProfile?.id);
  const stored = useProfileStore((s) => s.ownProfile?.locale);
  const language = currentLanguage();

  useEffect(() => {
    if (!userId || stored === language) return;
    let cancelled = false;

    void (async () => {
      const { error } = await supabase
        .from('profiles')
        .update({ locale: language })
        .eq('id', userId);
      if (error || cancelled) return;

      // Mirror into the store so a remount compares equal and skips the write.
      const own = useProfileStore.getState().ownProfile;
      if (own) useProfileStore.getState().setOwnProfile({ ...own, locale: language });
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, stored, language]);
}
