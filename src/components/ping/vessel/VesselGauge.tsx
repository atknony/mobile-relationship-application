import { View } from 'react-native';
import Animated, { useAnimatedProps, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { GAUGE_SIZE, GAUGE_STROKE } from '@/constants/vessel';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const R = (GAUGE_SIZE - GAUGE_STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;

const ARC = 'rgba(224,71,95,0.9)';
const ARC_READY = 'rgb(214,66,95)';

/**
 * The charge ring.
 *
 * The design calls for `conic-gradient(colour Xdeg, transparent Xdeg)` — whose
 * stops are coincident, making it a hard-edged solid arc rather than a sweep.
 * An SVG stroke with an animated dash offset reproduces that exactly, so this
 * is a faithful port and not an approximation.
 */
export function VesselGauge({ p, ready }: { p: SharedValue<number>; ready: SharedValue<number> }) {
  const arcProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - p.value),
    stroke: ready.value === 1 ? ARC_READY : ARC,
  }));

  // Scaling the RN view is cheaper than transforming inside the SVG.
  const wrapper = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - p.value * 0.03 }],
  }));

  return (
    <>
      {/* Static track */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: GAUGE_SIZE,
          height: GAUGE_SIZE,
          borderRadius: GAUGE_SIZE / 2,
          borderWidth: GAUGE_STROKE,
          borderColor: 'rgba(45,27,105,0.07)',
        }}
      />
      <Animated.View pointerEvents="none" style={[wrapper, { position: 'absolute', opacity: 0.85 }]}>
        <Svg width={GAUGE_SIZE} height={GAUGE_SIZE}>
          <AnimatedCircle
            cx={GAUGE_SIZE / 2}
            cy={GAUGE_SIZE / 2}
            r={R}
            fill="none"
            strokeWidth={GAUGE_STROKE}
            strokeDasharray={CIRCUMFERENCE}
            strokeLinecap="butt"
            // CSS conic gradients start at 12 o'clock; SVG arcs start at 3.
            originX={GAUGE_SIZE / 2}
            originY={GAUGE_SIZE / 2}
            rotation={-90}
            animatedProps={arcProps}
          />
        </Svg>
      </Animated.View>
    </>
  );
}
