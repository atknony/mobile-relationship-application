import { useEffect } from 'react';
import { Modal, View, Text, Pressable } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Avatar } from '@/components/ui/Avatar';
import { ReplyOrb } from '@/components/ping/ReplyOrb';
import { RadialGlow } from '@/components/ping/vessel/RadialGlow';
import { useSendPing } from '@/hooks/useSendPing';
import { usePairCelebration } from '@/hooks/usePairCelebration';

const WASH = 520;
const AVATAR = 92;
/** Each avatar's distance from centre before they come together. */
const APART = 78;
/** How much the two circles overlap once they meet, so they read as one pair. */
const OVERLAP = AVATAR * 0.36;
/** Each avatar's distance from centre once they have met. */
const TOGETHER = (AVATAR - OVERLAP) / 2;

const WARM_WASH = [
  { offset: '0%', color: '#FFA46E', opacity: 0.55 },
  { offset: '40%', color: '#FF7A6B', opacity: 0.25 },
  { offset: '72%', color: '#FF7A6B', opacity: 0 },
];
const COOL_WASH = [
  { offset: '0%', color: '#8FC4FF', opacity: 0.55 },
  { offset: '40%', color: '#74B9FF', opacity: 0.25 },
  { offset: '72%', color: '#74B9FF', opacity: 0 },
];

/**
 * The moment two people become a pair. The arrival overlay's sibling: the
 * same whole-screen wash rather than a card, but in both colours — warm is you,
 * cool is them — and the two avatars drift in from either side and meet.
 *
 * Tap anywhere to continue, or hold the orb to send the very first ping.
 * Mounted in (home)/_layout.tsx, before IncomingPingOverlay, so a ping that
 * arrives during the celebration opens on top of it.
 */
export function PairCelebrationOverlay() {
  const { celebration, dismiss } = usePairCelebration();

  if (!celebration) return null;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={dismiss}>
      <CelebrationContent
        key={celebration.pairId}
        partnerName={celebration.partnerName}
        partnerAvatar={celebration.partnerAvatar}
        ownName={celebration.ownName}
        ownAvatar={celebration.ownAvatar}
        onDismiss={dismiss}
      />
    </Modal>
  );
}

function CelebrationContent({
  partnerName,
  partnerAvatar,
  ownName,
  ownAvatar,
  onDismiss,
}: {
  partnerName: string;
  partnerAvatar: string | null;
  ownName: string;
  ownAvatar: string | null;
  onDismiss: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { sendPing } = useSendPing();

  const meet = useSharedValue(0);
  const text = useSharedValue(0);
  const glow = useSharedValue(0);

  useEffect(() => {
    // They come together first; the words follow once they have.
    meet.value = withDelay(120, withSpring(1, { damping: 14, stiffness: 90, mass: 0.9 }));
    text.value = withDelay(520, withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }));
    glow.value = withDelay(
      600,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.sin) })
        ),
        -1
      )
    );
  }, [meet, text, glow]);

  // Inline, not a helper: these run as worklets on the UI thread, where a plain
  // JS function from this scope cannot be called.
  const ownStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, meet.value * 1.6),
    transform: [
      { translateX: -(APART + (TOGETHER - APART) * meet.value) },
      { scale: 0.9 + meet.value * 0.1 },
    ],
  }));
  const partnerStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, meet.value * 1.6),
    transform: [
      { translateX: APART + (TOGETHER - APART) * meet.value },
      { scale: 0.9 + meet.value * 0.1 },
    ],
  }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: meet.value * (0.35 + glow.value * 0.3),
    transform: [{ scale: 0.92 + meet.value * 0.08 + glow.value * 0.04 }],
  }));
  const textStyle = useAnimatedStyle(() => ({
    opacity: text.value,
    transform: [{ translateY: (1 - text.value) * 10 }],
  }));

  return (
    <Pressable onPress={onDismiss} style={{ flex: 1 }} className="bg-imm-bg">
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: WASH,
          height: WASH,
          left: '50%',
          top: '30%',
          marginLeft: -WASH * 0.78,
          marginTop: -WASH / 2,
        }}
      >
        <RadialGlow id="pairWarmWash" size={WASH} stops={WARM_WASH} />
      </View>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: WASH,
          height: WASH,
          left: '50%',
          top: '30%',
          marginLeft: -WASH * 0.22,
          marginTop: -WASH / 2,
        }}
      >
        <RadialGlow id="pairCoolWash" size={WASH} stops={COOL_WASH} />
      </View>

      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 30,
          gap: 30,
        }}
      >
        <View
          style={{
            width: APART * 2 + AVATAR + 40,
            height: AVATAR + 56,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Animated.View
            pointerEvents="none"
            style={[
              ringStyle,
              {
                position: 'absolute',
                width: AVATAR * 2 - OVERLAP + 44,
                height: AVATAR + 44,
                borderRadius: (AVATAR + 44) / 2,
                borderWidth: 1,
                borderColor: 'rgba(255,122,107,0.4)',
              },
            ]}
          />
          <Animated.View style={[ownStyle, { position: 'absolute' }]}>
            <Avatar uri={ownAvatar} name={ownName} size={AVATAR} tone="warm" />
          </Animated.View>
          <Animated.View style={[partnerStyle, { position: 'absolute' }]}>
            <Avatar uri={partnerAvatar} name={partnerName} size={AVATAR} />
          </Animated.View>
        </View>

        <Animated.View style={[textStyle, { alignItems: 'center', gap: 6 }]}>
          <Text
            className="font-nunito text-imm-muted"
            style={{ fontSize: 12, letterSpacing: 1.7 }}
          >
            {t('pair.connected')}
          </Text>
          <Text
            className="font-display text-imm-text text-center"
            style={{ fontSize: 38, lineHeight: 44 }}
          >
            {t('pair.youAnd', { name: partnerName })}
          </Text>
          <Text className="font-nunito text-imm-muted text-center" style={{ fontSize: 15 }}>
            {t('pair.connectedBody')}
          </Text>
        </Animated.View>

        <Animated.View style={textStyle}>
          <ReplyOrb
            label={t('pair.holdFirst')}
            onSend={() => {
              void sendPing();
              onDismiss();
            }}
          />
        </Animated.View>
      </View>
    </Pressable>
  );
}
