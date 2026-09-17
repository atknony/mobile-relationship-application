import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useCachedImage } from '@/hooks/useCachedImage';

const FADE_IN_MS = 280;
const BREATHE_MS = 1100;

interface MomentPhotoProps {
  /** Storage path in the private `moments` bucket. */
  path: string;
  height: number;
  borderRadius: number;
  boxShadow: string;
}

/**
 * A ping photo that owns its space from the first frame.
 *
 * The card is laid out at its final size as soon as the path is known, so it
 * never pushes anything around when the photo arrives.
 *
 * A photo already on disk (lib/imageCache.ts) is simply shown — no placeholder,
 * no fade — because it is there in the first frame. One that has to download
 * gets a softly breathing tint and fades in once it has actually decoded
 * (onLoad, not once a URI exists: a view with a URI is still blank while it
 * loads). If loading fails the tint stays; collapsing the card would be the
 * same jump in reverse.
 *
 * Give it `key={path}` wherever the path can change under a mounted instance,
 * so a different photo starts from the right state.
 */
export function MomentPhoto({ path, height, borderRadius, boxShadow }: MomentPhotoProps) {
  const { uri, cachedAtMount, onDecodeError } = useCachedImage('moments', path);
  const [loaded, setLoaded] = useState(cachedAtMount);

  const photoOpacity = useSharedValue(cachedAtMount ? 1 : 0);
  const breathe = useSharedValue(0);

  useEffect(() => {
    if (loaded) {
      cancelAnimation(breathe);
      return;
    }
    breathe.value = withRepeat(
      withTiming(1, { duration: BREATHE_MS, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
    return () => cancelAnimation(breathe);
  }, [loaded, breathe]);

  const placeholderStyle = useAnimatedStyle(() => ({
    opacity: 0.55 + breathe.value * 0.45,
  }));
  const photoStyle = useAnimatedStyle(() => ({ opacity: photoOpacity.value }));

  const handleLoad = () => {
    if (loaded) return;
    setLoaded(true);
    photoOpacity.value = withTiming(1, { duration: FADE_IN_MS, easing: Easing.out(Easing.quad) });
  };

  return (
    <View
      className="bg-imm-surface"
      style={{ width: '100%', height, borderRadius, overflow: 'hidden', boxShadow }}
    >
      {cachedAtMount ? null : (
        <Animated.View
          pointerEvents="none"
          style={[
            { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
            { backgroundColor: 'rgba(45,27,105,0.06)' },
            placeholderStyle,
          ]}
        />
      )}
      {uri ? (
        <Animated.View style={[{ flex: 1 }, photoStyle]}>
          <Image
            source={{ uri }}
            style={{ width: '100%', height }}
            contentFit="cover"
            cachePolicy="memory"
            onLoad={handleLoad}
            onError={onDecodeError}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}
