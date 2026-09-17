import { useState } from 'react';
import { View, Text } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { gradients } from '@/constants/colors';
import { shadows } from '@/constants/shadows';
import { useCachedImage } from '@/hooks/useCachedImage';

const FADE_IN_MS = 200;

interface AvatarProps {
  /** A storage path in the private `avatars` bucket. */
  uri?: string | null;
  /**
   * A photo already on this device, shown in preference to `uri`. Lets a
   * just-picked photo appear at once instead of waiting on the upload.
   */
  localUri?: string | null;
  name?: string | null;
  size?: number;
  /** Colour of the no-photo fallback. Warm is you, cool is your partner. */
  tone?: 'warm' | 'cool';
}

/**
 * Initials on the gradient, or the real photo filling the same circle.
 *
 * A photo already on disk (see lib/imageCache.ts) is drawn straight away with no
 * transition and no initials behind it — painting the initials first would
 * flash a letter for a frame on every mount. Only a photo that actually has to
 * download sits over the initials and cross-fades in.
 */
export function Avatar({ uri, localUri, name, size = 56, tone = 'cool' }: AvatarProps) {
  const initial = name?.trim()?.[0]?.toUpperCase() ?? '';
  const cached = useCachedImage('avatars', localUri ? null : uri);
  const source = localUri ?? cached.uri;
  const instant = Boolean(localUri) || cached.cachedAtMount;
  const hasPhoto = Boolean(localUri || uri);
  // The photo this avatar opened with. Only that one appears without a
  // transition; a later change (the partner picking a new photo while this is
  // on screen) cross-fades from the old photo instead of snapping.
  const [openedWith] = useState(source);
  const transition = instant && source === openedWith ? null : FADE_IN_MS;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: 'hidden',
        boxShadow: shadows.avatar,
      }}
    >
      {hasPhoto && instant ? null : (
        <LinearGradient
          {...(tone === 'warm'
            ? {
                colors: [...gradients.warmOrb] as const,
                locations: [...gradients.warmOrbStops] as const,
                start: { x: 0.34, y: 0.28 },
                end: { x: 1, y: 1 },
              }
            : {
                colors: [...gradients.coolAvatar] as const,
                start: { x: 0.15, y: 0 },
                end: { x: 0.85, y: 1 },
              })}
          style={{
            position: 'absolute',
            width: size,
            height: size,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            className="font-nunito-semibold text-white"
            style={{ fontSize: size * 0.36, lineHeight: size * 0.44 }}
          >
            {initial}
          </Text>
        </LinearGradient>
      )}

      {source ? (
        <Image
          source={{ uri: source }}
          style={{ width: size, height: size }}
          contentFit="cover"
          // The file is already on disk; keeping a second copy there would be waste.
          cachePolicy="memory"
          transition={transition}
          onError={localUri ? undefined : cached.onDecodeError}
        />
      ) : null}
    </View>
  );
}
