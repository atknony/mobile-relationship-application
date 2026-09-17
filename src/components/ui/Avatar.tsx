import { View, Text, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { gradients } from '@/constants/colors';
import { shadows } from '@/constants/shadows';
import { useSignedUrl } from '@/hooks/useSignedUrl';

interface AvatarProps {
  /** A storage path in the private `avatars` bucket, signed here for display. */
  uri?: string | null;
  /**
   * A photo already on this device, shown in preference to `uri`. Lets a
   * just-picked photo appear at once instead of waiting on the upload, a
   * signature and a download of the same image.
   */
  localUri?: string | null;
  name?: string | null;
  size?: number;
  /** Colour of the no-photo fallback. Warm is you, cool is your partner. */
  tone?: 'warm' | 'cool';
}

/**
 * Initials on the gradient, or the real photo filling the same circle.
 */
export function Avatar({ uri, localUri, name, size = 56, tone = 'cool' }: AvatarProps) {
  const initial = name?.trim()?.[0]?.toUpperCase() ?? '';
  const { data: signedUrl } = useSignedUrl(localUri ? null : uri, 'avatars');
  const source = localUri ?? signedUrl;

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
      {source ? (
        <Image source={{ uri: source }} style={{ width: size, height: size }} resizeMode="cover" />
      ) : (
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
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text
            className="font-nunito-semibold text-white"
            style={{ fontSize: size * 0.36, lineHeight: size * 0.44 }}
          >
            {initial}
          </Text>
        </LinearGradient>
      )}
    </View>
  );
}
