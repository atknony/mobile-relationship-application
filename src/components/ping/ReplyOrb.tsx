import { View, Text } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { GestureDetector } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { usePingAnimation } from '@/hooks/usePingAnimation';
import { gradients } from '@/constants/colors';
import { shadows } from '@/constants/shadows';
import { SURGE_SPAN, VESSEL_COMPRESS, VESSEL_SURGE_SWELL } from '@/constants/vessel';

const ORB = 58;
const RING = 74;

/**
 * Hold to answer, without leaving the arrival screen.
 *
 * Note: the design prototype's arrival screen is static markup — this orb has no
 * numeric contract of its own. The handoff says only that it uses "the same
 * gesture and timing as the home vessel", so it reuses usePingAnimation and the
 * vessel's compress/swell mapping at a smaller scale. Worth a design review.
 */
export function ReplyOrb({ onSend }: { onSend: () => void }) {
  const { p, burst, gesture } = usePingAnimation({
    onSend,
    onEarlyRelease: () => {
      // Haptic only — same as the home vessel.
    },
  });

  const orb = useAnimatedStyle(() => {
    const surge =
      burst.value > 0 ? Math.sin(Math.min(burst.value / SURGE_SPAN, 1) * Math.PI) : 0;
    return {
      transform: [{ scale: 1 - p.value * VESSEL_COMPRESS + surge * VESSEL_SURGE_SWELL }],
    };
  });

  const ring = useAnimatedStyle(() => ({
    opacity: 0.35 + p.value * 0.5,
    transform: [{ scale: 1 + p.value * 0.06 }],
  }));

  return (
    <View className="items-center" style={{ gap: 10 }}>
      <GestureDetector gesture={gesture}>
        <View style={{ width: RING, height: RING, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View
            pointerEvents="none"
            style={[
              ring,
              {
                position: 'absolute',
                width: RING,
                height: RING,
                borderRadius: RING / 2,
                borderWidth: 1.5,
                borderColor: 'rgba(255,122,107,0.35)',
              },
            ]}
          />
          <Animated.View
            style={[
              orb,
              {
                width: ORB,
                height: ORB,
                borderRadius: ORB / 2,
                overflow: 'hidden',
                boxShadow: shadows.warm,
              },
            ]}
          >
            <LinearGradient
              colors={[...gradients.warmOrb]}
              locations={[...gradients.warmOrbStops]}
              start={{ x: 0.34, y: 0.28 }}
              end={{ x: 1, y: 1 }}
              style={{ flex: 1 }}
            />
          </Animated.View>
        </View>
      </GestureDetector>
      <Text className="font-display text-imm-muted" style={{ fontSize: 12 }}>
        hold to answer
      </Text>
    </View>
  );
}
