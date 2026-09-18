import { useEffect, useState } from 'react';
import { Modal, Pressable, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { shadows } from '@/constants/shadows';
import { SHEET_CLOSE_MS, SHEET_OPEN_MS } from '@/constants/timing';

/**
 * A sheet that rises from the bottom over a dimmed backdrop. Controlled by
 * `visible`; it keeps itself mounted while it animates out, so closing is a
 * slide rather than a cut. Tapping the backdrop or Android back calls onClose.
 */
export function BottomSheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [mounted, setMounted] = useState(visible);
  const progress = useSharedValue(0);
  // Until the sheet has measured itself, travel the whole window: it must
  // start fully off-screen, never drawn in place for a frame.
  const sheetHeight = useSharedValue(windowHeight);

  // Mount as soon as it is asked to open (during render, not in an effect);
  // unmounting waits for the slide-out below.
  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    if (visible) {
      progress.value = withTiming(1, { duration: SHEET_OPEN_MS, easing: Easing.out(Easing.cubic) });
      return;
    }
    progress.value = withTiming(0, { duration: SHEET_CLOSE_MS, easing: Easing.in(Easing.cubic) });
    const timer = setTimeout(() => setMounted(false), SHEET_CLOSE_MS);
    return () => clearTimeout(timer);
  }, [visible, progress]);

  const backdrop = useAnimatedStyle(() => ({ opacity: progress.value }));
  const sheet = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - progress.value) * sheetHeight.value }],
  }));

  if (!mounted) return null;

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <Animated.View
        style={[
          { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
          { backgroundColor: 'rgba(45,27,105,0.3)' },
          backdrop,
        ]}
      >
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityRole="button" />
      </Animated.View>

      <Animated.View
        onLayout={(e) => {
          sheetHeight.value = e.nativeEvent.layout.height;
        }}
        className="bg-imm-surface"
        style={[
          {
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            borderTopLeftRadius: 26,
            borderTopRightRadius: 26,
            paddingTop: 10,
            paddingHorizontal: 22,
            paddingBottom: insets.bottom + 16,
            boxShadow: shadows.cardLift,
          },
          sheet,
        ]}
      >
        <View
          style={{
            alignSelf: 'center',
            width: 36,
            height: 4,
            borderRadius: 2,
            backgroundColor: 'rgba(45,27,105,0.15)',
            marginBottom: title ? 14 : 8,
          }}
        />
        {title ? (
          <Text className="font-display text-imm-text" style={{ fontSize: 22, marginBottom: 6 }}>
            {title}
          </Text>
        ) : null}
        {children}
      </Animated.View>
    </Modal>
  );
}
