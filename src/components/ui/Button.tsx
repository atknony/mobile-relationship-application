import { Pressable, Text, ActivityIndicator } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps {
  onPress?: () => void;
  children: string;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-imm-coral',
  secondary: 'bg-transparent border-2 border-imm-blue',
  ghost: 'bg-transparent',
  danger: 'bg-red-400',
};

const textClasses: Record<Variant, string> = {
  primary: 'text-white',
  secondary: 'text-imm-blue',
  ghost: 'text-imm-text',
  danger: 'text-white',
};

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

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 10, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 10, stiffness: 300 });
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      style={animatedStyle}
      className={`
        flex-row items-center justify-center
        rounded-2xl px-6 py-4
        ${variantClasses[variant]}
        ${disabled || loading ? 'opacity-50' : ''}
        ${className}
      `}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'secondary' || variant === 'ghost' ? '#74B9FF' : '#FFFFFF'}
          size="small"
        />
      ) : (
        <Text className={`font-nunito-bold text-base ${textClasses[variant]}`}>
          {children}
        </Text>
      )}
    </AnimatedPressable>
  );
}
