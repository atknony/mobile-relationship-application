import { Image, View, Text } from 'react-native';

interface AvatarProps {
  uri?: string | null;
  name?: string;
  size?: number;
}

export function Avatar({ uri, name, size = 56 }: AvatarProps) {
  const initials = name
    ? name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  return (
    <View
      className="items-center justify-center rounded-full bg-imm-blue overflow-hidden"
      style={{ width: size, height: size }}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: size, height: size }}
          resizeMode="cover"
        />
      ) : (
        <Text
          className="font-nunito-bold text-white"
          style={{ fontSize: size * 0.35 }}
        >
          {initials}
        </Text>
      )}
    </View>
  );
}
