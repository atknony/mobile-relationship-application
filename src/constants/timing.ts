import { Easing } from 'react-native-reanimated';

export const CHARGE_DURATION_MS = 1200;
// Compared against the LINEAR hold progress, not the eased value — 0.75 is 900ms.
// Lowered from 0.85 after testing: 1200ms felt long at the old threshold.
export const MIN_CHARGE_THRESHOLD = 0.75;
export const INCOMING_PING_AUTODISMISS_MS = 8000;
// How long an incoming photo ping is held back so its photo can arrive with it.
// A typical photo is ready well inside a second. Past this the ping is shown
// anyway, with the photo's space reserved: a late photo is a flaw, a ping that
// never arrives on a bad connection would be a failure.
export const INCOMING_PHOTO_WAIT_MS = 3000;
// A pair is celebrated if it became active this recently and this phone has not
// celebrated it yet — long enough to catch someone who had the app closed at the
// moment their partner redeemed the code, short enough that signing in on a new
// phone next week does not throw a party for an old pair.
export const PAIR_CELEBRATION_WINDOW_MS = 60 * 60 * 1000;
export const PAIR_CELEBRATION_AUTODISMISS_MS = 12000;
// How long the celebration waits for both avatars so it can open complete.
export const PAIR_CELEBRATION_AVATAR_WAIT_MS = 1500;
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
// A launch into Home holds the splash until the partner's photo is decoded, so
// the header is complete when the app appears. Kept under the settle timeout:
// a missing photo is shown late (initials, then a fade), never waited on longer.
export const STARTUP_AVATAR_WAIT_MS = 2000;
// The photo waiting under the vessel. Picked, it settles in; sent, it rises
// toward the vessel, shrinking as it fades — it went with the ping; removed, it
// only fades. The camera button comes back once the photo is mostly gone.
export const PHOTO_ATTACH_MS = 240;
export const PHOTO_SEND_EXIT_MS = 440;
export const PHOTO_REMOVE_EXIT_MS = 200;
export const PHOTO_CAMERA_RETURN_MS = 260;
// Bottom sheets rise a little slower than they fall away, like the system's.
export const SHEET_OPEN_MS = 260;
export const SHEET_CLOSE_MS = 200;
// Changing language fades the app to the ground colour, swaps every string
// while nothing is visible, then fades back. The fade-out is longer than the
// sheet's close so the sheet (its own window, which the fade cannot reach) is
// gone before its text changes.
export const LANGUAGE_FADE_OUT_MS = 220;
export const LANGUAGE_FADE_IN_MS = 260;

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
