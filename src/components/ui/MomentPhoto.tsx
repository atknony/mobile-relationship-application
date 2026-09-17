import { useEffect, useState } from 'react';
import { Image, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSignedMomentUrl } from '@/hooks/useSignedUrl';

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
 * Getting a photo on screen takes two round trips — signing the path, then
 * downloading and decoding the image — and the overlay used to render nothing
 * until the first had finished. The card then appeared at full height about a
 * second after the name, and in a vertically centred column that shoved the
 * text up. The path is known the instant the ping arrives, so the card is laid
 * out at its final size immediately: a softly breathing tint stands in, and
 * the photo fades in over it once it has actually decoded (onLoad, not once a
 * URL exists — an <Image> with a URL is still blank while it downloads).
 *
 * If signing or loading fails the tint simply stays. Collapsing the card would
 * be the same jump in reverse.
 *
 * Give it `key={path}` wherever the path can change under a mounted instance,
 * so a different photo starts from the placeholder. The URL deliberately does
 * not reset it: the same photo is re-signed periodically, and that must not blink.
 */
export function MomentPhoto({ path, height, borderRadius, boxShadow }: MomentPhotoProps) {
  const { data: url } = useSignedMomentUrl(path);
  const [loaded, setLoaded] = useState(false);

  const photoOpacity = useSharedValue(0);
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
    setLoaded(true);
    photoOpacity.value = withTiming(1, { duration: FADE_IN_MS, easing: Easing.out(Easing.quad) });
  };

  return (
    <View
      className="bg-imm-surface"
      style={{ width: '100%', height, borderRadius, overflow: 'hidden', boxShadow }}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
          { backgroundColor: 'rgba(45,27,105,0.06)' },
          placeholderStyle,
        ]}
      />
      {url ? (
        <Animated.View style={[{ flex: 1 }, photoStyle]}>
          <Image
            source={{ uri: url }}
            style={{ width: '100%', height }}
            resizeMode="cover"
            onLoad={handleLoad}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}
