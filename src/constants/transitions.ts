import type { NativeStackNavigationOptions } from 'expo-router';

/**
 * Screen transitions — the only place they are chosen. Three kinds of movement,
 * each meaning something different:
 *
 * - `stateChange` — the auth guard moving you between route groups (signing in
 *   or out, pairing, unpairing). Nothing is "forward" or "back" here; the whole
 *   app becomes a different app, so it cross-fades. It used to be a hard cut,
 *   because the root rendered a bare <Slot />.
 *
 * - `panel` — Moments and Settings, opened from Home's header. They rise and
 *   fade in over Home and sink back out of it, so Home itself never moves. The
 *   platform default here slid Home in rigidly from the left on the way back,
 *   which read as leaving and re-entering Home rather than closing something.
 *
 * - `step` — a next step in a linear flow (phone → code, invite → their code).
 *   Horizontal, because it is sequential, but the iOS-style parallax rather than
 *   Android's full-width slide: the screen underneath shifts a little and dims
 *   instead of being shoved off whole.
 *
 * `animationDuration` only applies on iOS (whose default is 500ms, which feels
 * slow for all of these); Android uses its own tuned durations.
 */

export const stateChange: NativeStackNavigationOptions = {
  animation: 'fade',
  animationDuration: 320,
};

export const panel: NativeStackNavigationOptions = {
  animation: 'fade_from_bottom',
  animationDuration: 340,
};

export const step: NativeStackNavigationOptions = {
  animation: 'ios_from_right',
};
