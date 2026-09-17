import { useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import { CHARGE_STEP_STYLES } from '@/constants/hapticPatterns';

export function useHaptics() {
  // step: 1 = Light, 2 = Medium, 3 = Heavy
  const chargeHaptic = useCallback((step: 1 | 2 | 3) => {
    void Haptics.impactAsync(CHARGE_STEP_STYLES[step - 1]);
  }, []);

  const burstHaptic = useCallback(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const releaseEarlyHaptic = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const errorHaptic = useCallback(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }, []);

  // The moment the hold passes the send threshold. The send screen is wordless,
  // so this tap is the only notice the user gets that releasing will now send.
  const readyHaptic = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
  }, []);

  return { chargeHaptic, burstHaptic, releaseEarlyHaptic, errorHaptic, readyHaptic };
}
