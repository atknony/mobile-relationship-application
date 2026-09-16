import { useCallback, useEffect } from 'react';
import {
  useSharedValue,
  useAnimatedReaction,
  useFrameCallback,
  useReducedMotion,
  runOnJS,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { Gesture } from 'react-native-gesture-handler';
import { useHaptics } from '@/hooks/useHaptics';
import { CHARGE_DURATION_MS, MIN_CHARGE_THRESHOLD } from '@/constants/timing';
import {
  BURST_DURATION_MS,
  DECAY_DURATION_MS,
  PHASE_BURST,
  PHASE_CHARGE,
  PHASE_DECAY,
  PHASE_IDLE,
  SETTLE_SPAN,
  SETTLE_START,
  SETTLE_WOBBLE_AMPLITUDE,
  SETTLE_WOBBLE_CYCLES,
} from '@/constants/vessel';

interface PingAnimationOptions {
  onSend: () => void;
  onEarlyRelease: () => void;
  disabled?: boolean;
}

export interface PingAnimation {
  /** Eased charge, 0..1. Every visual layer reads this. */
  p: SharedValue<number>;
  /** Linear hold progress — what the threshold and the haptic ladder test. */
  pLinear: SharedValue<number>;
  /** Post-release clock, 0..1, non-zero only while overflowing. */
  burst: SharedValue<number>;
  /** 1 once the hold has passed the threshold and the vessel is straining. */
  ready: SharedValue<number>;
  /** Free-running wall clock in seconds, for wobble and squash. */
  clock: SharedValue<number>;
  gesture: ReturnType<typeof Gesture.Pan>;
  reducedMotion: boolean;
}

/**
 * Drives the send vessel from one UI-thread frame loop.
 *
 * A single loop rather than per-phase withTiming, because: the settle curve is a
 * non-monotonic ad-hoc formula no standard easing expresses; the ready-squash
 * and the meniscus wobble need a free-running wall clock; and one clock
 * guarantees every layer samples the same instant.
 */
export function usePingAnimation({
  onSend,
  onEarlyRelease,
  disabled,
}: PingAnimationOptions): PingAnimation {
  const phase = useSharedValue(PHASE_IDLE);
  const t0 = useSharedValue(0);
  const tRel = useSharedValue(0);
  const pAt = useSharedValue(0);

  const p = useSharedValue(0);
  const pLinear = useSharedValue(0);
  const burst = useSharedValue(0);
  const ready = useSharedValue(0);
  const clock = useSharedValue(0);

  const reducedMotion = useReducedMotion();
  const reduced = useSharedValue(reducedMotion ? 1 : 0);
  // In an effect, not the render body — writing a shared value during render is
  // a side effect React may run twice.
  useEffect(() => {
    reduced.value = reducedMotion ? 1 : 0;
  }, [reducedMotion, reduced]);

  const { chargeHaptic, burstHaptic, releaseEarlyHaptic, readyHaptic } = useHaptics();

  const handleSendJS = useCallback(() => {
    burstHaptic();
    onSend();
  }, [onSend, burstHaptic]);

  const handleEarlyReleaseJS = useCallback(() => {
    releaseEarlyHaptic();
    onEarlyRelease();
  }, [onEarlyRelease, releaseEarlyHaptic]);

  useFrameCallback(() => {
    'worklet';
    // performance.now() on the UI runtime, so the gesture and the loop share an
    // epoch. Mixing Date.now() here with frame timestamps would drift.
    const now = performance.now();
    clock.value = now / 1000;

    if (phase.value === PHASE_IDLE) return;

    if (phase.value === PHASE_CHARGE) {
      const raw = Math.min((now - t0.value) / CHARGE_DURATION_MS, 1);
      pLinear.value = raw;
      p.value = 1 - (1 - raw) * (1 - raw); // ease-out quad
      ready.value = raw >= MIN_CHARGE_THRESHOLD ? 1 : 0;
      return;
    }

    if (phase.value === PHASE_DECAY) {
      const e = (now - tRel.value) / DECAY_DURATION_MS;
      if (e >= 1) {
        phase.value = PHASE_IDLE;
        p.value = 0;
        pLinear.value = 0;
        return;
      }
      const f = 1 - e;
      // Springy recoil rather than a linear drain.
      p.value = pAt.value * f * f * (1 + Math.sin(e * 16) * 0.14 * f);
      pLinear.value = p.value;
      return;
    }

    // PHASE_BURST — overflow, then ease back down.
    const e = (now - tRel.value) / BURST_DURATION_MS;
    burst.value = Math.min(e, 1);

    const k = Math.max(0, Math.min((burst.value - SETTLE_START) / SETTLE_SPAN, 1));
    const eased = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; // easeInOutCubic
    const settle =
      Math.sin(k * Math.PI * SETTLE_WOBBLE_CYCLES) *
      SETTLE_WOBBLE_AMPLITUDE *
      (1 - k) *
      (1 - k);
    // The charge must ease down, not snap. This curve is the whole point of the
    // redesign — it replaces a withDelay/withTiming hard reset.
    p.value = Math.max(0, 1 - eased + settle);
    pLinear.value = p.value;

    if (e >= 1) {
      phase.value = PHASE_IDLE;
      p.value = 0;
      pLinear.value = 0;
      burst.value = 0;
    }
  }, true);

  // Progressive haptics on thirds of the linear hold, plus one tap the moment
  // the threshold is crossed — that moment has to be felt, not read.
  useAnimatedReaction(
    () => (phase.value === PHASE_CHARGE ? Math.floor(pLinear.value * 3) : -1),
    (current, previous) => {
      if (current !== previous && current > 0 && current <= 3) {
        runOnJS(chargeHaptic)(current as 1 | 2 | 3);
      }
    }
  );

  useAnimatedReaction(
    () => ready.value,
    (current, previous) => {
      if (current === 1 && previous === 0) runOnJS(readyHaptic)();
    }
  );

  const gesture = Gesture.Pan()
    .minDistance(0)
    // The prototype releases on window pointerup: sliding off the vessel must
    // not cancel the hold.
    .shouldCancelWhenOutside(false)
    .onBegin(() => {
      'worklet';
      if (disabled) return;
      if (phase.value === PHASE_BURST) return; // ignore re-press mid-overflow
      phase.value = PHASE_CHARGE;
      t0.value = performance.now();
      burst.value = 0;
      ready.value = 0;
    })
    .onEnd(() => {
      'worklet';
      if (disabled) return;
      if (phase.value !== PHASE_CHARGE) return;

      const now = performance.now();
      const raw = Math.min((now - t0.value) / CHARGE_DURATION_MS, 1);
      tRel.value = now;
      ready.value = 0;

      if (raw >= MIN_CHARGE_THRESHOLD) {
        if (reduced.value === 1) {
          // No overflow, no sparks — just let the level fall away.
          phase.value = PHASE_IDLE;
          p.value = withTiming(0, { duration: 300 });
          pLinear.value = 0;
          burst.value = 0;
        } else {
          phase.value = PHASE_BURST;
          burst.value = 0;
          p.value = 1;
        }
        runOnJS(handleSendJS)();
      } else {
        phase.value = PHASE_DECAY;
        pAt.value = p.value;
        runOnJS(handleEarlyReleaseJS)();
      }
    })
    .onFinalize((_event, success) => {
      'worklet';
      if (success) return;
      // Cancelled by a system gesture — drain like an early release.
      if (phase.value === PHASE_CHARGE) {
        phase.value = PHASE_DECAY;
        pAt.value = p.value;
        tRel.value = performance.now();
        ready.value = 0;
      }
    });

  return { p, pLinear, burst, ready, clock, gesture, reducedMotion };
}
