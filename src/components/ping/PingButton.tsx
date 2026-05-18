import { View, Text } from 'react-native';
import Animated from 'react-native-reanimated';
import { GestureDetector } from 'react-native-gesture-handler';
import { usePingAnimation } from '@/hooks/usePingAnimation';
import { PingRipple } from './PingRipple';
import { PingParticles } from './PingParticles';
import { usePingStore } from '@/stores/pingStore';

interface PingButtonProps {
  onSend: () => void;
  disabled?: boolean;
}

const BUTTON_SIZE = 120;

export function PingButton({ onSend, disabled = false }: PingButtonProps) {
  const pingStatus = usePingStore((s) => s.pingStatus);

  const handleEarlyRelease = () => {
    // Subtle feedback — nothing dramatic needed, haptic handles it
  };

  const { chargeProgress, burstTrigger, gesture, buttonAnimatedStyle } =
    usePingAnimation({
      onSend,
      onEarlyRelease: handleEarlyRelease,
      disabled: disabled || pingStatus === 'sending',
    });

  return (
    <View className="items-center justify-center">
      <PingParticles burstTrigger={burstTrigger} />
      <PingRipple chargeProgress={chargeProgress} />

      <GestureDetector gesture={gesture}>
        <Animated.View
          style={[
            buttonAnimatedStyle,
            {
              width: BUTTON_SIZE,
              height: BUTTON_SIZE,
              borderRadius: BUTTON_SIZE / 2,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#74B9FF',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.4,
              shadowRadius: 12,
              elevation: 8,
            },
          ]}
        >
          <Text className="font-nunito-bold text-white text-center text-xs leading-tight">
            {disabled ? 'offline' : 'hold\nme'}
          </Text>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
