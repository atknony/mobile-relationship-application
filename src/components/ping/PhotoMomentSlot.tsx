import { useEffect, useRef, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { CameraGlyph } from '@/components/ui/CameraGlyph';
import { shadows } from '@/constants/shadows';
import {
  PHOTO_ATTACH_MS,
  PHOTO_CAMERA_RETURN_MS,
  PHOTO_REMOVE_EXIT_MS,
  PHOTO_SEND_EXIT_MS,
} from '@/constants/timing';

const CAMERA_SIZE = 54;
const PHOTO_WIDTH = 96;
const PHOTO_HEIGHT = 72;
// How far a sent photo travels up, toward the vessel, as it goes.
const SEND_RISE = 44;

/**
 * The camera button under the vessel, and the photo that replaces it once one
 * is picked.
 *
 * The slot is always the camera button's height, and the photo is anchored to
 * its bottom and grows upward over the space below the vessel. Nothing reflows
 * when a photo comes or goes, so the vessel never moves — least of all in the
 * moment right after a send, when it is still playing its burst.
 *
 * The photo stays drawn after `uri` clears so it can leave: clearing it is a
 * send unless it was the remove link, which only fades it.
 */
export function PhotoMomentSlot({
  uri,
  onPick,
  onRemove,
}: {
  uri: string | undefined;
  onPick: () => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  // What is drawn — it outlives `uri` by the length of the exit.
  const [shown, setShown] = useState(uri);
  if (uri && uri !== shown) setShown(uri);

  const removing = useRef(false);
  const photo = useSharedValue(uri ? 1 : 0);
  const sending = useSharedValue(0);
  const camera = useSharedValue(uri ? 0 : 1);

  useEffect(() => {
    if (uri) {
      sending.value = 0;
      photo.value = withTiming(1, { duration: PHOTO_ATTACH_MS, easing: Easing.out(Easing.cubic) });
      camera.value = withTiming(0, { duration: PHOTO_ATTACH_MS / 2 });
      return;
    }

    const sent = !removing.current;
    removing.current = false;
    const exitMs = sent ? PHOTO_SEND_EXIT_MS : PHOTO_REMOVE_EXIT_MS;
    sending.value = sent ? 1 : 0;
    photo.value = withTiming(0, {
      duration: exitMs,
      easing: sent ? Easing.in(Easing.quad) : Easing.out(Easing.quad),
    });
    camera.value = withDelay(
      exitMs * 0.6,
      withTiming(1, { duration: PHOTO_CAMERA_RETURN_MS, easing: Easing.out(Easing.cubic) })
    );
    const timer = setTimeout(() => setShown(undefined), exitMs);
    return () => clearTimeout(timer);
  }, [uri, photo, sending, camera]);

  const photoStyle = useAnimatedStyle(() => {
    const p = photo.value;
    if (sending.value === 1) {
      return {
        opacity: p,
        transform: [
          { translateY: -SEND_RISE * (1 - p) },
          { scale: interpolate(p, [0, 1], [0.55, 1]) },
        ],
      };
    }
    return { opacity: p, transform: [{ translateY: 0 }, { scale: interpolate(p, [0, 1], [0.92, 1]) }] };
  });

  // The link is not part of what is sent: on a send it is gone in the first
  // part of the exit rather than riding up with the photo.
  const linkStyle = useAnimatedStyle(() => ({
    opacity: sending.value === 1 ? interpolate(photo.value, [0.6, 1], [0, 1], 'clamp') : photo.value,
  }));

  const cameraStyle = useAnimatedStyle(() => ({
    opacity: camera.value,
    transform: [{ scale: interpolate(camera.value, [0, 1], [0.86, 1]) }],
  }));

  return (
    <View style={{ width: '100%', height: CAMERA_SIZE }}>
      <Animated.View
        pointerEvents={shown ? 'none' : 'auto'}
        style={[{ position: 'absolute', bottom: 0, alignSelf: 'center' }, cameraStyle]}
      >
        <Pressable
          onPress={onPick}
          hitSlop={8}
          accessibilityLabel={t('home.addPhoto')}
          style={{
            width: CAMERA_SIZE,
            height: CAMERA_SIZE,
            borderRadius: CAMERA_SIZE / 2,
            backgroundColor: 'rgba(255,255,255,0.66)',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: shadows.floatButton,
          }}
        >
          <CameraGlyph />
        </Pressable>
      </Animated.View>

      {shown ? (
        <View
          // Leaving, it takes no touches: the camera button is coming back.
          pointerEvents={uri ? 'box-none' : 'none'}
          style={{ position: 'absolute', bottom: 0, alignSelf: 'center', alignItems: 'center', gap: 8 }}
        >
          <Animated.View style={photoStyle}>
            <Image
              source={{ uri: shown }}
              style={{ width: PHOTO_WIDTH, height: PHOTO_HEIGHT, borderRadius: 14 }}
              resizeMode="cover"
            />
          </Animated.View>
          <Animated.View style={linkStyle}>
            <Pressable
              onPress={() => {
                removing.current = true;
                onRemove();
              }}
              hitSlop={8}
            >
              <Text className="font-nunito text-imm-muted" style={{ fontSize: 12 }}>
                {t('home.removePhoto')}
              </Text>
            </Pressable>
          </Animated.View>
        </View>
      ) : null}
    </View>
  );
}
