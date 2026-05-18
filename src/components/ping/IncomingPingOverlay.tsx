import { Modal, View, Text, Pressable, Image } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIncomingPing } from '@/hooks/useIncomingPing';
import { Avatar } from '@/components/ui/Avatar';
import { useProfileStore } from '@/stores/profileStore';
import { SPRING_BOUNCE } from '@/constants/timing';

function HeartBeat() {
  const scale = useSharedValue(1);

  const start = () => {
    scale.value = withRepeat(
      withSequence(
        withSpring(1.3, SPRING_BOUNCE),
        withSpring(1, SPRING_BOUNCE)
      ),
      -1,
      false
    );
  };

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Start on first render
  start();

  return (
    <Animated.Text style={style} className="text-5xl">
      💙
    </Animated.Text>
  );
}

export function IncomingPingOverlay() {
  const { incomingPing, dismiss } = useIncomingPing();
  const partnerProfile = useProfileStore((s) => s.partnerProfile);
  const insets = useSafeAreaInsets();

  if (!incomingPing) return null;

  const timeAgo = 'just now';

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={dismiss}
    >
      <Pressable
        onPress={dismiss}
        style={{ flex: 1 }}
      >
        <BlurView
          intensity={85}
          tint="light"
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
        >
          <View
            className="bg-white/80 rounded-4xl mx-8 px-8 py-10 items-center gap-6"
            style={{ paddingTop: insets.top + 24 }}
          >
            <Avatar
              uri={partnerProfile?.avatar_url}
              name={incomingPing.fromDisplayName}
              size={80}
            />

            <HeartBeat />

            <View className="items-center gap-1">
              <Text className="font-nunito-bold text-imm-text text-xl text-center">
                {incomingPing.fromDisplayName}
              </Text>
              <Text className="font-nunito text-imm-muted text-base text-center">
                is thinking of you
              </Text>
              <Text className="font-nunito text-imm-muted text-sm">{timeAgo}</Text>
            </View>

            {incomingPing.momentUrl ? (
              <Image
                source={{ uri: incomingPing.momentUrl }}
                className="w-full rounded-3xl"
                style={{ height: 200, resizeMode: 'cover' }}
              />
            ) : null}

            <Text className="font-nunito text-imm-muted text-xs">
              tap anywhere to close
            </Text>
          </View>
        </BlurView>
      </Pressable>
    </Modal>
  );
}
