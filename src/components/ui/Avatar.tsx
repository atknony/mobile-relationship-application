import { View, Text, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { gradients } from '@/constants/colors';

interface AvatarProps {
  uri?: string | null;
  name?: string | null;
  size?: number;
}

/**
 * Initials on the cool gradient, or the real photo filling the same circle.
 * Cool is her colour throughout the app — warm is yours.
 */
export function Avatar({ uri, name, size = 56 }: AvatarProps) {
  const initial = name?.trim()?.[0]?.toUpperCase() ?? '';

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: 'hidden',
        shadowColor: '#2D1B69',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.14,
        shadowRadius: 8,
        elevation: 3,
      }}
    >
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size }} resizeMode="cover" />
      ) : (
        <LinearGradient
          colors={[...gradients.coolAvatar]}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.85, y: 1 }}
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
