import * as Haptics from 'expo-haptics';

// Maps charge level steps (1-3) to haptic intensity.
// Called from useHaptics.ts when chargeProgress crosses 33%/66%/100%.
export const CHARGE_STEP_STYLES = [
  Haptics.ImpactFeedbackStyle.Light,   // 0–33%
  Haptics.ImpactFeedbackStyle.Medium,  // 33–66%
  Haptics.ImpactFeedbackStyle.Heavy,   // 66–100%
] as const;
