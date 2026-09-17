import AsyncStorage from '@react-native-async-storage/async-storage';
import { claimCelebration, isWithinCelebrationWindow, wasCelebrated } from '@/lib/pairCelebration';
import { PAIR_CELEBRATION_WINDOW_MS } from '@/constants/timing';

const NOW = Date.parse('2026-09-17T12:00:00Z');
const ago = (ms: number) => new Date(NOW - ms).toISOString();

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('isWithinCelebrationWindow', () => {
  it('celebrates a pair that just became active', () => {
    expect(isWithinCelebrationWindow(ago(2_000), NOW)).toBe(true);
    // Someone who closed the app while waiting and came back half an hour later.
    expect(isWithinCelebrationWindow(ago(30 * 60_000), NOW)).toBe(true);
  });

  it('does not celebrate an old pair, e.g. signing in on a new phone later', () => {
    expect(isWithinCelebrationWindow(ago(PAIR_CELEBRATION_WINDOW_MS + 1), NOW)).toBe(false);
  });

  it('tolerates a phone clock slightly ahead of the server, but not nonsense', () => {
    expect(isWithinCelebrationWindow(ago(-30_000), NOW)).toBe(true);
    expect(isWithinCelebrationWindow(ago(-10 * 60_000), NOW)).toBe(false);
    expect(isWithinCelebrationWindow('not a date', NOW)).toBe(false);
  });
});

describe('claimCelebration', () => {
  it('lets a pair be celebrated exactly once on a device', async () => {
    expect(await wasCelebrated('pair-1')).toBe(false);
    expect(await claimCelebration('pair-1')).toBe(true);
    expect(await wasCelebrated('pair-1')).toBe(true);
    expect(await claimCelebration('pair-1')).toBe(false);
  });

  it('still celebrates a new pair after re-pairing', async () => {
    await claimCelebration('pair-1');
    expect(await claimCelebration('pair-2')).toBe(true);
  });

  it('survives corrupt storage rather than throwing', async () => {
    await AsyncStorage.setItem('imm:celebrated-pairs', '{not json');
    expect(await claimCelebration('pair-1')).toBe(true);
  });
});
