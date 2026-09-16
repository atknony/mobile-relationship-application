import { Modal, View, Text, Pressable, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIncomingPing } from '@/hooks/useIncomingPing';
import { useSignedMomentUrl } from '@/hooks/useSignedUrl';
import { useSendPing } from '@/hooks/useSendPing';
import { Avatar } from '@/components/ui/Avatar';
import { ReplyOrb } from './ReplyOrb';
import { RadialGlow } from './vessel/RadialGlow';
import { useProfileStore } from '@/stores/profileStore';
import { shadows } from '@/constants/shadows';

const WASH = 680;

const WASH_STOPS = [
  { offset: '0%', color: '#FFA46E', opacity: 0.6 },
  { offset: '36%', color: '#FF7A6B', opacity: 0.3 },
  { offset: '70%', color: '#FF7A6B', opacity: 0 },
];

/**
 * Their ping lands. Their name is the loudest thing on screen — the whole screen
 * warms rather than showing a card on a dimmed background.
 */
export function IncomingPingOverlay() {
  const { incomingPing, dismiss } = useIncomingPing();
  const partnerProfile = useProfileStore((s) => s.partnerProfile);
  const insets = useSafeAreaInsets();
  const { sendPing } = useSendPing();
  // The bucket is private: the stored path is signed on demand, never persisted.
  const { data: momentUrl } = useSignedMomentUrl(incomingPing?.momentPath);

  if (!incomingPing) return null;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={dismiss}>
      <Pressable onPress={dismiss} style={{ flex: 1 }} className="bg-imm-bg">
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: WASH,
            height: WASH,
            left: '50%',
            top: '34%',
            marginLeft: -WASH / 2,
            marginTop: -WASH / 2,
            opacity: 0.7,
          }}
        >
          <RadialGlow id="arrivalWash" size={WASH} stops={WASH_STOPS} />
        </View>

        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: insets.top + 24,
            paddingBottom: insets.bottom + 24,
            paddingHorizontal: 30,
            gap: 26,
          }}
        >
          {/* Avatar inside two concentric rings */}
          <View style={{ width: 150, height: 150, alignItems: 'center', justifyContent: 'center' }}>
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                width: 150,
                height: 150,
                borderRadius: 75,
                borderWidth: 1,
                borderColor: 'rgba(255,122,107,0.3)',
              }}
            />
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                width: 122,
                height: 122,
                borderRadius: 61,
                borderWidth: 1,
                borderColor: 'rgba(255,122,107,0.45)',
              }}
            />
            <Avatar
              uri={partnerProfile?.avatar_url}
              name={incomingPing.fromDisplayName}
              size={96}
            />
          </View>

          <View className="items-center" style={{ gap: 6 }}>
            <Text
              className="font-display text-imm-text text-center"
              style={{ fontSize: 38, lineHeight: 42 }}
            >
              {incomingPing.fromDisplayName}
            </Text>
            <Text className="font-nunito text-imm-muted text-center" style={{ fontSize: 15 }}>
              is thinking of you
            </Text>
            <Text
              className="font-nunito text-imm-muted"
              style={{ fontSize: 12, letterSpacing: 1.7, textTransform: 'uppercase' }}
            >
              just now
            </Text>
          </View>

          {momentUrl ? (
            <View
              className="bg-imm-surface"
              style={{
                width: '100%',
                borderRadius: 26,
                overflow: 'hidden',
                boxShadow: shadows.cardLift,
              }}
            >
              <Image source={{ uri: momentUrl }} style={{ height: 212 }} resizeMode="cover" />
            </View>
          ) : null}

          <ReplyOrb onSend={() => void sendPing()} />
        </View>
      </Pressable>
    </Modal>
  );
}
