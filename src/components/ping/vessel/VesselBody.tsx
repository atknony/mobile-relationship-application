import { View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { RadialGlow } from './RadialGlow';
import { gradients } from '@/constants/colors';
import {
  CORE_SIZE,
  FILL_MAX,
  FILL_RANGE,
  FILL_REST,
  FILL_SURGE,
  MENISCUS_FADE_FROM,
  MENISCUS_FADE_RANGE,
  MENISCUS_HEIGHT,
  MENISCUS_WOBBLE_X_BASE,
  MENISCUS_WOBBLE_X_FREQ,
  MENISCUS_WOBBLE_X_GAIN,
  MENISCUS_WOBBLE_Y_AMPLITUDE,
  MENISCUS_WOBBLE_Y_FREQ,
  READY_SQUASH_AMPLITUDE,
  READY_SQUASH_FREQ,
  SURGE_SPAN,
  VESSEL_COMPRESS,
  VESSEL_SIZE,
  VESSEL_SURGE_SWELL,
} from '@/constants/vessel';

const CORE_STOPS = [
  { offset: '0%', color: '#FFFFFF', opacity: 0.95 },
  { offset: '70%', color: '#FFFFFF', opacity: 0 },
];

const SPECULAR_STOPS = [
  { offset: '0%', color: '#FFFFFF', opacity: 0.5 },
  { offset: '100%', color: '#FFFFFF', opacity: 0 },
];

interface VesselBodyProps {
  p: SharedValue<number>;
  burst: SharedValue<number>;
  ready: SharedValue<number>;
  clock: SharedValue<number>;
  reducedMotion: boolean;
}

/**
 * The vessel: a glass circle holding a liquid level that rises with the hold and
 * overflows on release.
 */
export function VesselBody({ p, burst, ready, clock, reducedMotion }: VesselBodyProps) {
  const body = useAnimatedStyle(() => {
    const surge =
      burst.value > 0 ? Math.sin(Math.min(burst.value / SURGE_SPAN, 1) * Math.PI) : 0;
    // Once past the threshold the vessel strains — a fast asymmetric squash.
    const squash =
      ready.value === 1 && !reducedMotion
        ? Math.sin(clock.value * READY_SQUASH_FREQ) * READY_SQUASH_AMPLITUDE
        : 0;
    const s = 1 - p.value * VESSEL_COMPRESS + surge * VESSEL_SURGE_SWELL + squash;
    return {
      // Non-uniform on purpose: x and y move in opposition while straining.
      transform: [{ scaleX: s }, { scaleY: s - squash * 2 }],
    };
  });

  const fill = useAnimatedStyle(() => {
    const surge =
      burst.value > 0 ? Math.sin(Math.min(burst.value / SURGE_SPAN, 1) * Math.PI) : 0;
    const level = Math.min(FILL_REST + p.value * FILL_RANGE + surge * FILL_SURGE, FILL_MAX);
    // scaleY, never height: animating height forces a layout pass every frame.
    // Anything past 100% is clipped by the vessel, exactly as in the prototype.
    return { transform: [{ scaleY: level / 100 }] };
  });

  const meniscus = useAnimatedStyle(() => {
    const surge =
      burst.value > 0 ? Math.sin(Math.min(burst.value / SURGE_SPAN, 1) * Math.PI) : 0;
    const level = Math.min(FILL_REST + p.value * FILL_RANGE + surge * FILL_SURGE, FILL_MAX);
    const wobbleX = reducedMotion
      ? 1
      : 1 +
        Math.sin(clock.value * MENISCUS_WOBBLE_X_FREQ) *
          (MENISCUS_WOBBLE_X_BASE + p.value * MENISCUS_WOBBLE_X_GAIN);
    const wobbleY = reducedMotion
      ? 1
      : 1 +
        Math.sin(clock.value * MENISCUS_WOBBLE_Y_FREQ + 1) * MENISCUS_WOBBLE_Y_AMPLITUDE;
    return {
      // Rides the surface of the liquid.
      transform: [
        { translateY: -(level / 100) * VESSEL_SIZE },
        { scaleX: wobbleX },
        { scaleY: wobbleY },
      ],
      // Gone once the liquid has swallowed the rim.
      opacity: 1 - Math.max(0, (level - MENISCUS_FADE_FROM) / MENISCUS_FADE_RANGE),
    };
  });

  const core = useAnimatedStyle(() => {
    const surge =
      burst.value > 0 ? Math.sin(Math.min(burst.value / SURGE_SPAN, 1) * Math.PI) : 0;
    return {
      opacity: p.value * 0.5 + surge * 0.5,
      transform: [{ scale: 0.6 + p.value * 0.8 }],
    };
  });

  const ring = useAnimatedStyle(() => ({
    borderColor: `rgba(255,255,255,${0.9 - p.value * 0.3})`,
  }));

  return (
    <Animated.View
      style={[
        body,
        {
          width: VESSEL_SIZE,
          height: VESSEL_SIZE,
          borderRadius: VESSEL_SIZE / 2,
          overflow: 'hidden',
          backgroundColor: 'rgba(255,255,255,0.62)',
          alignItems: 'center',
          justifyContent: 'center',
          // Static shadow: iOS can animate these, Android only has elevation, so
          // a tightening shadow would not match across platforms. The compression
          // is carried by scale instead.
          shadowColor: '#2D1B69',
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.14,
          shadowRadius: 30,
          elevation: 8,
        },
      ]}
    >
      {/* Liquid — wider than the vessel so its edges never show at the sides */}
      <Animated.View
        pointerEvents="none"
        style={[
          fill,
          {
            position: 'absolute',
            left: '-10%',
            right: '-10%',
            bottom: 0,
            height: '100%',
            transformOrigin: 'bottom',
          },
        ]}
      >
        <LinearGradient
          colors={[...gradients.liquidFill]}
          locations={[...gradients.liquidFillStops]}
          style={{ flex: 1 }}
        />
      </Animated.View>

      {/* Meniscus — a soft band at the liquid's surface. RN has no blur filter,
          so the softness comes from a vertical alpha ramp. */}
      <Animated.View
        pointerEvents="none"
        style={[
          meniscus,
          {
            position: 'absolute',
            left: '-10%',
            right: '-10%',
            bottom: -MENISCUS_HEIGHT / 2,
            height: MENISCUS_HEIGHT,
            borderRadius: 9999,
            overflow: 'hidden',
          },
        ]}
      >
        <LinearGradient
          colors={['rgba(255,196,170,0)', 'rgba(255,196,170,0.9)', 'rgba(255,196,170,0)']}
          style={{ flex: 1 }}
        />
      </Animated.View>

      <Animated.View pointerEvents="none" style={[core, { position: 'absolute' }]}>
        <RadialGlow id="vesselCore" size={CORE_SIZE} stops={CORE_STOPS} />
      </Animated.View>

      {/* Static highlight */}
      <View pointerEvents="none" style={{ position: 'absolute', top: 16, left: 26 }}>
        <RadialGlow id="vesselSpecular" size={46} height={22} stops={SPECULAR_STOPS} />
      </View>

      <Animated.View
        pointerEvents="none"
        style={[
          ring,
          {
            position: 'absolute',
            width: VESSEL_SIZE,
            height: VESSEL_SIZE,
            borderRadius: VESSEL_SIZE / 2,
            borderWidth: 1.5,
          },
        ]}
      />
    </Animated.View>
  );
}
