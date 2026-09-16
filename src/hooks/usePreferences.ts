import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useProfileStore } from '@/stores/profileStore';

export const VIBRATE_KEY = 'imm:vibrate-on-arrival';

/** Minutes since local midnight → "23:00". */
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * True when the given moment falls inside the quiet window. The window wraps
 * midnight (23:00–07:00 is the common case), which is why this is not a plain
 * `start <= now < end`.
 */
export function isQuietNow(start: number | null, end: number | null, at = new Date()): boolean {
  if (start === null || end === null) return false;
  const now = at.getHours() * 60 + at.getMinutes();
  return start <= end ? now >= start && now < end : now >= start || now < end;
}

/**
 * Vibrate-on-arrival is a property of this device, so it lives in AsyncStorage.
 * Quiet hours belong to the person and will eventually gate server-side push,
 * so they live on the profile row.
 */
export function usePreferences() {
  const userId = useAuthStore((s) => s.user?.id);
  const ownProfile = useProfileStore((s) => s.ownProfile);
  const setOwnProfile = useProfileStore((s) => s.setOwnProfile);

  const [vibrate, setVibrateState] = useState(true);

  useEffect(() => {
    void AsyncStorage.getItem(VIBRATE_KEY).then((raw) => {
      if (raw !== null) setVibrateState(raw === 'true');
    });
  }, []);

  const setVibrate = useCallback((next: boolean) => {
    setVibrateState(next);
    void AsyncStorage.setItem(VIBRATE_KEY, String(next));
  }, []);

  const quietStart = ownProfile?.quiet_hours_start ?? null;
  const quietEnd = ownProfile?.quiet_hours_end ?? null;

  const setQuietHours = useCallback(
    async (start: number | null, end: number | null) => {
      if (!userId || !ownProfile) return;
      // Optimistic: the switch should not wait on the network.
      setOwnProfile({ ...ownProfile, quiet_hours_start: start, quiet_hours_end: end });
      await supabase
        .from('profiles')
        .update({ quiet_hours_start: start, quiet_hours_end: end })
        .eq('id', userId);
    },
    [userId, ownProfile, setOwnProfile]
  );

  return { vibrate, setVibrate, quietStart, quietEnd, setQuietHours };
}
