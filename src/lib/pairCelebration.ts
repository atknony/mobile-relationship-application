import AsyncStorage from '@react-native-async-storage/async-storage';
import { PAIR_CELEBRATION_WINDOW_MS } from '@/constants/timing';

const CELEBRATED_KEY = 'imm:celebrated-pairs';
/** Only recent pairs can qualify, so a short memory is plenty. */
const REMEMBER = 20;

/**
 * Whether this phone should celebrate this pair: it became active within the
 * window, and this phone has not celebrated it before.
 *
 * Keyed on the pair, not on "partner_id just went from null to set", because
 * that transition is only visible to a phone that was open when it happened.
 * The person who shared the code may well have closed the app while waiting;
 * they still deserve the moment when they come back. Remembered per device
 * rather than on the server, because it is about what this screen has shown.
 */
export function isWithinCelebrationWindow(activatedAt: string, now = Date.now()): boolean {
  const at = Date.parse(activatedAt);
  return Number.isFinite(at) && now - at >= -60_000 && now - at <= PAIR_CELEBRATION_WINDOW_MS;
}

async function readCelebrated(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(CELEBRATED_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

export async function wasCelebrated(pairId: string): Promise<boolean> {
  return (await readCelebrated()).includes(pairId);
}

/**
 * Claims the celebration for this pair: resolves true once per pair per device.
 * Call it immediately before showing, after any waiting — claiming and then
 * being cancelled would lose the moment — and record it before it is visible,
 * so a crash mid-celebration never replays it.
 */
export async function claimCelebration(pairId: string): Promise<boolean> {
  const celebrated = await readCelebrated();
  if (celebrated.includes(pairId)) return false;
  try {
    await AsyncStorage.setItem(
      CELEBRATED_KEY,
      JSON.stringify([pairId, ...celebrated].slice(0, REMEMBER))
    );
  } catch {
    // Storage failing is not a reason to skip the moment; worst case it could
    // show again inside the window.
  }
  return true;
}
