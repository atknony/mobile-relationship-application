import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedReaction,
  withSpring,
  withSequence,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { View } from 'react-native';
import { colors } from '@/constants/colors';
import { BURST_RADIUS, SPRING_BOUNCE } from '@/constants/timing';

const PARTICLE_COUNT = 12;
const PARTICLE_SIZE = 8;

interface ParticleProps {
  angle: number;
  burstTrigger: SharedValue<number>;
  color: string;
}

function Particle({ angle, burstTrigger, color }: ParticleProps) {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0);

  useAnimatedReaction(
    () => burstTrigger.value,
    (current, previous) => {
      if (current !== previous && current > 0) {
        const dx = Math.cos(angle) * BURST_RADIUS;
        const dy = Math.sin(angle) * BURST_RADIUS;

        // Burst outward
        tx.value = withSpring(dx, SPRING_BOUNCE);
        ty.value = withSpring(dy, SPRING_BOUNCE);
        opacity.value = withSequence(
          withTiming(1, { duration: 60 }),
          withDelay(180, withTiming(0, { duration: 320 }))
        );
        scale.value = withSequence(
          withSpring(1.2, SPRING_BOUNCE),
          withDelay(200, withSpring(0, SPRING_BOUNCE))
        );

        // Return to center
        tx.value = withDelay(500, withSpring(0, SPRING_BOUNCE));
        ty.value = withDelay(500, withSpring(0, SPRING_BOUNCE));
      }
    }
  );

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        style,
        {
          position: 'absolute',
          width: PARTICLE_SIZE,
          height: PARTICLE_SIZE,
          borderRadius: PARTICLE_SIZE / 2,
          backgroundColor: color,
        },
      ]}
    />
  );
}

interface PingParticlesProps {
  burstTrigger: SharedValue<number>;
}

export function PingParticles({ burstTrigger }: PingParticlesProps) {
  const particleColors = [colors.coral, colors.blue, colors.muted];

  return (
    <View
      style={{
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      {Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
        <Particle
          key={i}
          angle={(i / PARTICLE_COUNT) * 2 * Math.PI}
          burstTrigger={burstTrigger}
          color={particleColors[i % particleColors.length]}
        />
      ))}
    </View>
  );
}
