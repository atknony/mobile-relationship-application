import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { BRACE_HEIGHT, BRACE_INSET, BRACE_WIDTH } from '@/constants/vessel';

const EDGE = 'rgba(224,71,95,0.35)';
const CAP = 'rgba(224,71,95,0.2)';

/**
 * The two side braces that close in on the vessel as it charges — the visual
 * cue that something is being squeezed.
 */
export function VesselBraces({ p }: { p: SharedValue<number> }) {
  const left = useAnimatedStyle(() => ({
    opacity: 0.2 + p.value * 0.6,
    transform: [{ translateX: p.value * 34 }, { scaleY: 1 + p.value * 0.25 }],
  }));

  const right = useAnimatedStyle(() => ({
    opacity: 0.2 + p.value * 0.6,
    transform: [{ translateX: -p.value * 34 }, { scaleY: 1 + p.value * 0.25 }],
  }));

  const base = {
    position: 'absolute',
    width: BRACE_WIDTH,
    height: BRACE_HEIGHT,
    borderRadius: 9999,
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
    borderTopColor: CAP,
    borderBottomColor: CAP,
  } as const;

  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={[base, left, { left: BRACE_INSET, borderLeftWidth: 1.5, borderLeftColor: EDGE }]}
      />
      <Animated.View
        pointerEvents="none"
        style={[base, right, { right: BRACE_INSET, borderRightWidth: 1.5, borderRightColor: EDGE }]}
      />
    </>
  );
}
