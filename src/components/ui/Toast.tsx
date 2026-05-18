import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TOAST_AUTODISMISS_MS } from '@/constants/timing';

type ToastVariant = 'success' | 'error' | 'info';

interface ToastMessage {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

const variantClasses: Record<ToastVariant, string> = {
  success: 'bg-imm-blue',
  error: 'bg-imm-coral',
  info: 'bg-imm-muted',
};

function ToastItem({ message, variant }: { message: string; variant: ToastVariant }) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(-80);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const show = useCallback(() => {
    translateY.value = withTiming(0, { duration: 300 });
    translateY.value = withDelay(
      TOAST_AUTODISMISS_MS,
      withTiming(-80, { duration: 300 })
    );
  }, []);

  // Trigger animation after mount
  useState(() => {
    show();
  });

  return (
    <Animated.View
      style={[animatedStyle, { top: insets.top + 8, position: 'absolute', left: 16, right: 16 }]}
    >
      <View className={`rounded-2xl px-4 py-3 ${variantClasses[variant]}`}>
        <Text className="font-nunito-semibold text-white text-sm">{message}</Text>
      </View>
    </Animated.View>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const counter = useRef(0);

  const showToast = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = ++counter.current;
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, TOAST_AUTODISMISS_MS + 400);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toasts.map((toast) => (
        <ToastItem key={toast.id} message={toast.message} variant={toast.variant} />
      ))}
    </ToastContext.Provider>
  );
}
