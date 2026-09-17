import { Pressable, Text, ActivityIndicator, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients } from '@/constants/colors';
import { shadows } from '@/constants/shadows';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Variant = 'primary' | 'secondary' | 'quiet' | 'ghost';

interface ButtonProps {
  onPress?: () => void;
  children: string;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

const RADIUS = 18;

export function Button({
  onPress,
  children,
  variant = 'primary',
  loading = false,
  disabled = false,
  className = '',
}: ButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // 0.97 over 120ms — the old 0.95 spring was heavy at this size.
  const handlePressIn = () => {
    scale.value = withTiming(0.97, { duration: 120 });
  };
  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: 120 });
  };

  // "Continue" was rendering as "Continu". Android measures the label with the
  // fallback face before Nunito-Bold has been swapped in, so the text node ends
  // up a hair narrower than the glyphs it then paints and the last character is
  // clipped off. flexShrink: 0 stops the node being squeezed to that stale
  // measurement, and includeFontPadding: false drops Android's extra metrics so
  // the label still sits on the vertical centre.
  const label = (
    <Text
      className="font-nunito-bold"
      style={{
        fontSize: 16,
        color: variant === 'primary' ? colors.white : colors.text,
        flexShrink: 0,
        includeFontPadding: false,
        textAlign: 'center',
      }}
    >
      {children}
    </Text>
  );

  const body = loading ? (
    <ActivityIndicator color={variant === 'primary' ? colors.white : colors.muted} size="small" />
  ) : (
    label
  );

  const shared = {
    borderRadius: RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 17,
    paddingHorizontal: 24,
  } as const;

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      style={[animatedStyle, { opacity: disabled || loading ? 0.5 : 1, borderRadius: RADIUS }]}
      className={className}
    >
      {variant === 'primary' ? (
        <LinearGradient
          colors={[...gradients.primaryButton]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[
            shared,
            { boxShadow: shadows.warm },
          ]}
        >
          {body}
        </LinearGradient>
      ) : (
        <View
          style={[
            shared,
            variant === 'secondary' && {
              backgroundColor: 'rgba(255,255,255,0.7)',
              borderWidth: 1.5,
              borderColor: 'rgba(45,27,105,0.1)',
            },
            variant === 'quiet' && { backgroundColor: colors.surfaceQuiet, paddingVertical: 13 },
            variant === 'ghost' && { backgroundColor: 'transparent' },
          ]}
        >
          {body}
        </View>
      )}
    </AnimatedPressable>
  );
}
