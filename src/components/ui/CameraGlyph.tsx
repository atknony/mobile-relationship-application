import { View } from 'react-native';
import { colors } from '@/constants/colors';

/**
 * A camera drawn from two shapes, replacing the 📷/🖼️ emoji. The design
 * removes every emoji from the app in favour of 1.5px stroked forms.
 */
export function CameraGlyph({ width = 22, height = 17 }: { width?: number; height?: number }) {
  const ring = Math.round(height * 0.47);
  return (
    <View
      style={{
        width,
        height,
        borderRadius: 5,
        borderWidth: 1.5,
        borderColor: colors.muted,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          width: ring,
          height: ring,
          borderRadius: ring / 2,
          borderWidth: 1.5,
          borderColor: colors.muted,
        }}
      />
    </View>
  );
}
