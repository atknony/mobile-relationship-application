import { View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { Avatar } from '@/components/ui/Avatar';

const SIZE = 42;

/**
 * The partner's avatar with a ring that pulses about a second after a ping is
 * released — the ping arriving at her end.
 *
 * Driven by the release clock, not the charge: the handoff describes this as
 * "it arrives at her end ~1s after release". (The HTML prototype wires it to the
 * charge value instead, which would pulse during the hold and read as the wrong
 * thing entirely.)
 */
export function PartnerPulse({
  uri,
  name,
  burst,
}: {
  uri?: string | null;
  name?: string | null;
  burst: SharedValue<number>;
}) {
  const ring = useAnimatedStyle(() => {
    const r = Math.max(0, Math.min((burst.value - 0.42) / 0.45, 1));
    if (burst.value <= 0 || r <= 0) return { opacity: 0, transform: [{ scale: 1 }] };
    return {
      opacity: Math.sin(r * Math.PI) * 0.95,
      transform: [{ scale: 1 + r * 0.5 }],
    };
  });

  const avatar = useAnimatedStyle(() => {
    const r = Math.max(0, Math.min((burst.value - 0.42) / 0.45, 1));
    if (burst.value <= 0 || r <= 0) return { transform: [{ scale: 1 }] };
    return { transform: [{ scale: 1 + Math.sin(r * Math.PI) * 0.09 }] };
  });

  return (
    <View style={{ width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        pointerEvents="none"
        style={[
          ring,
          {
            position: 'absolute',
            width: SIZE + 8,
            height: SIZE + 8,
            borderRadius: (SIZE + 8) / 2,
            borderWidth: 1.5,
            borderColor: 'rgba(224,71,95,0.55)',
          },
        ]}
      />
      <Animated.View style={avatar}>
        <Avatar uri={uri} name={name} size={SIZE} />
      </Animated.View>
    </View>
  );
}
