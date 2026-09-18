import { Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { colors } from '@/constants/colors';
import { shadows } from '@/constants/shadows';

const PAD = 3;
const HEIGHT = 32;
// Equal, fixed segments: the pill slides by a whole segment, so every option
// must be the same width whatever its label.
const SEGMENT = 82;

/**
 * A choice between a few short options — a sunk track with a white pill that
 * slides to the selected one. Same timing and knob shadow as Toggle, so the
 * two read as one family inside a preference row.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
  label?: string;
}) {
  const index = Math.max(0, options.findIndex((o) => o.value === value));

  const pill = useAnimatedStyle(() => ({
    transform: [{ translateX: withTiming(index * SEGMENT, { duration: 160 }) }],
  }));

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      style={{
        flexDirection: 'row',
        height: HEIGHT,
        padding: PAD,
        borderRadius: HEIGHT / 2,
        backgroundColor: 'rgba(45,27,105,0.08)',
      }}
    >
      <Animated.View
        style={[
          pill,
          {
            position: 'absolute',
            top: PAD,
            bottom: PAD,
            left: PAD,
            width: SEGMENT,
            borderRadius: (HEIGHT - PAD * 2) / 2,
            backgroundColor: colors.white,
            boxShadow: shadows.knob,
          },
        ]}
      />
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => {
              if (!selected) onChange(option.value);
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            hitSlop={4}
            style={{ width: SEGMENT, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text
              className="font-nunito-semibold"
              style={{
                fontSize: 13,
                color: selected ? colors.text : colors.muted,
                // Same guard as Button: Android can clip the last glyph when the
                // label is measured before the custom font swaps in.
                flexShrink: 0,
                includeFontPadding: false,
              }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
