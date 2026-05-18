import Animated, { useAnimatedProps, interpolate, Extrapolation } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '@/constants/colors';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const RING_RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const SVG_SIZE = 160;
const CENTER = SVG_SIZE / 2;

interface RingProps {
  chargeProgress: SharedValue<number>;
  index: number; // 0, 1, 2
}

function Ring({ chargeProgress, index }: RingProps) {
  const delay = index * 0.08; // stagger offset in normalized charge units

  const animatedProps = useAnimatedProps(() => {
    const progress = Math.max(0, chargeProgress.value - delay);
    const normalized = Math.min(progress / (1 - delay), 1);
    const scale = interpolate(normalized, [0, 1], [1, 1.6], Extrapolation.CLAMP);
    const offset = CIRCUMFERENCE * (1 - normalized);
    const opacity = interpolate(normalized, [0, 0.2, 1], [0, 0.6, 0.3], Extrapolation.CLAMP);

    return {
      strokeDashoffset: offset,
      opacity,
      transform: [{ scale }] as never,
    };
  });

  return (
    <AnimatedCircle
      cx={CENTER}
      cy={CENTER}
      r={RING_RADIUS - index * 6}
      stroke={colors.blue}
      strokeWidth={2}
      fill="none"
      strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
      animatedProps={animatedProps}
      strokeLinecap="round"
    />
  );
}

interface PingRippleProps {
  chargeProgress: SharedValue<number>;
}

export function PingRipple({ chargeProgress }: PingRippleProps) {
  return (
    <View
      style={{
        position: 'absolute',
        width: SVG_SIZE,
        height: SVG_SIZE,
        pointerEvents: 'none',
      }}
    >
      <Svg width={SVG_SIZE} height={SVG_SIZE}>
        <Ring chargeProgress={chargeProgress} index={2} />
        <Ring chargeProgress={chargeProgress} index={1} />
        <Ring chargeProgress={chargeProgress} index={0} />
      </Svg>
    </View>
  );
}
