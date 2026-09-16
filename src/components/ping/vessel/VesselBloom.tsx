import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { BLOOM_SIZE, BLOOM_SPAN } from '@/constants/vessel';

/** The ring that expands outward once on release — the ping leaving. */
export function VesselBloom({
  burst,
  reducedMotion,
}: {
  burst: SharedValue<number>;
  reducedMotion: boolean;
}) {
  const style = useAnimatedStyle(() => {
    if (burst.value <= 0) return { opacity: 0, transform: [{ scale: 0.92 }] };
    const e = Math.min(burst.value / BLOOM_SPAN, 1);
    return {
      opacity: e < 1 ? (1 - e) * 0.85 : 0,
      // Reduced motion keeps the fade but not the expansion.
      transform: [{ scale: reducedMotion ? 0.92 : 0.92 + Math.pow(e, 0.65) * 2.6 }],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        style,
        {
          position: 'absolute',
          width: BLOOM_SIZE,
          height: BLOOM_SIZE,
          borderRadius: BLOOM_SIZE / 2,
          borderWidth: 2,
          borderColor: 'rgba(224,71,95,0.85)',
        },
      ]}
    />
  );
}
