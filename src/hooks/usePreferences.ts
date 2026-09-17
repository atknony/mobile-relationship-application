import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const VIBRATE_KEY = 'imm:vibrate-on-arrival';

/**
 * Vibrate-on-arrival is a property of this device, so it lives in AsyncStorage
 * rather than on the profile row.
 *
 * Quiet hours used to live here too. The switch wrote `profiles.quiet_hours_*`
 * and only the local notification ever honoured it — a push sent while the app
 * was closed came through regardless — so the setting promised something the
 * app could not keep. The columns stay (see 20260916150000_quiet_hours.sql);
 * the feature comes back when `send-ping` gates on them server-side.
 */
export function usePreferences() {
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

  return { vibrate, setVibrate };
}
