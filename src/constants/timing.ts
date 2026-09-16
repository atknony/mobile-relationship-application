import { Easing } from 'react-native-reanimated';

export const CHARGE_DURATION_MS = 1200;
// Compared against the LINEAR hold progress, not the eased value — 0.75 is 900ms.
// Lowered from 0.85 after testing: 1200ms felt long at the old threshold.
export const MIN_CHARGE_THRESHOLD = 0.75;
export const INCOMING_PING_AUTODISMISS_MS = 8000;
export const TOAST_AUTODISMISS_MS = 3000;
export const OFFLINE_PING_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
export const MAX_PING_RETRIES = 3;
export const MAX_QUEUED_PINGS = 5;        // offline send is blocked past this
export const PING_STATUS_RESET_MS = 4000; // 'sent' falls back to 'idle'
export const PING_FAILED_RESET_MS = 5000; // 'failed' lingers a little longer
export const UNPAIR_EXPIRY_HOURS = 24;
// How long the root layout will hold the splash waiting for the guard to land
// on the right route group. Settling takes a frame or two, so this is only
// reached if the guard and the router disagree — see the comment at its use.
export const STARTUP_SETTLE_TIMEOUT_MS = 3000;

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
