import { Easing } from 'react-native-reanimated';

export const CHARGE_DURATION_MS = 1200;
export const MIN_CHARGE_THRESHOLD = 0.85; // 85% charge required to fire
export const BURST_RADIUS = 80;           // particle spread radius in px
export const INCOMING_PING_AUTODISMISS_MS = 8000;
export const TOAST_AUTODISMISS_MS = 3000;
export const OFFLINE_PING_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
export const MAX_PING_RETRIES = 3;
export const UNPAIR_EXPIRY_HOURS = 24;

export const CHARGE_EASING = Easing.out(Easing.quad);

export const SPRING_SNAP_BACK = {
  damping: 12,
  stiffness: 180,
  mass: 0.8,
} as const;

export const SPRING_BOUNCE = {
  damping: 8,
  stiffness: 200,
  mass: 0.6,
} as const;
