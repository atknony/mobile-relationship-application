import { useCallback, useRef } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedReaction,
  withTiming,
  withSpring,
  withDelay,
  cancelAnimation,
  runOnJS,
  interpolateColor,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Gesture } from 'react-native-gesture-handler';
import { useHaptics } from '@/hooks/useHaptics';
import { colors } from '@/constants/colors';
import {
  CHARGE_DURATION_MS,
  CHARGE_EASING,
  MIN_CHARGE_THRESHOLD,
  SPRING_SNAP_BACK,
} from '@/constants/timing';

interface PingAnimationOptions {
  onSend: () => void;
  onEarlyRelease: () => void;
  disabled?: boolean;
}

export function usePingAnimation({ onSend, onEarlyRelease, disabled }: PingAnimationOptions) {
  const chargeProgress = useSharedValue(0);
  const burstTrigger = useSharedValue(0);
  const pressStartTime = useSharedValue(0);

  const { chargeHaptic, burstHaptic, releaseEarlyHaptic } = useHaptics();

  // Progressive haptics: fires at each 33% charge step
  useAnimatedReaction(
    () => Math.floor(chargeProgress.value * 3) as 0 | 1 | 2 | 3,
    (current, previous) => {
      if (current !== previous && current > 0 && current <= 3) {
        runOnJS(chargeHaptic)(current as 1 | 2 | 3);
      }
    }
  );

  const handleSendJS = useCallback(() => {
    burstHaptic();
    onSend();
  }, [onSend, burstHaptic]);

  const handleEarlyReleaseJS = useCallback(() => {
    releaseEarlyHaptic();
    onEarlyRelease();
  }, [onEarlyRelease, releaseEarlyHaptic]);

  const gesture = Gesture.Pan()
    .minDistance(0)
    .onBegin(() => {
      'worklet';
      if (disabled) return;
      pressStartTime.value = Date.now();
      chargeProgress.value = withTiming(1, {
        duration: CHARGE_DURATION_MS,
        easing: CHARGE_EASING,
      });
    })
    .onEnd(() => {
      'worklet';
      if (disabled) return;
      const elapsed = Date.now() - pressStartTime.value;
      const progress = Math.min(elapsed / CHARGE_DURATION_MS, 1);
      cancelAnimation(chargeProgress);

      if (progress >= MIN_CHARGE_THRESHOLD) {
        burstTrigger.value = burstTrigger.value + 1;
        chargeProgress.value = withDelay(400, withTiming(0, { duration: 300 }));
        runOnJS(handleSendJS)();
      } else {
        chargeProgress.value = withSpring(0, SPRING_SNAP_BACK);
        runOnJS(handleEarlyReleaseJS)();
      }
    })
    .onFinalize((_event, success) => {
      'worklet';
      if (!success && chargeProgress.value > 0) {
        cancelAnimation(chargeProgress);
        chargeProgress.value = withSpring(0, SPRING_SNAP_BACK);
      }
    });

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: interpolate(chargeProgress.value, [0, 1], [1, 1.12], Extrapolation.CLAMP),
      },
    ],
    backgroundColor: interpolateColor(
      chargeProgress.value,
      [0, 0.5, 1],
      [colors.blue, '#8FA5FF', colors.coral]
    ),
  }));

  return {
    chargeProgress,
    burstTrigger,
    gesture,
    buttonAnimatedStyle,
  };
}
