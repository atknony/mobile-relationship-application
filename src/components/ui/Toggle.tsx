import { Pressable } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients } from '@/constants/colors';

const TRACK_W = 46;
const TRACK_H = 28;
const KNOB = 22;
const PAD = 3;

export function Toggle({
  value,
  onChange,
  label,
}: {
  value: boolean;
  onChange: (next: boolean) => void;
  label?: string;
}) {
  const knob = useAnimatedStyle(() => ({
    transform: [{ translateX: withTiming(value ? TRACK_W - KNOB - PAD * 2 : 0, { duration: 160 }) }],
  }));

  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      hitSlop={8}
      style={{
        width: TRACK_W,
        height: TRACK_H,
        borderRadius: TRACK_H / 2,
        padding: PAD,
        justifyContent: 'center',
        backgroundColor: value ? 'transparent' : 'rgba(45,27,105,0.12)',
        overflow: 'hidden',
      }}
    >
      {value ? (
        <LinearGradient
          colors={[...gradients.primaryButton]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
      ) : null}
      <Animated.View
        style={[
          knob,
          {
            width: KNOB,
            height: KNOB,
            borderRadius: KNOB / 2,
            backgroundColor: colors.white,
            shadowColor: '#2D1B69',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.25,
            shadowRadius: 3,
            elevation: 2,
          },
        ]}
      />
    </Pressable>
  );
}
