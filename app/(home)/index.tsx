import { useCallback, useState } from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { useProfileStore } from '@/stores/profileStore';
import { usePingStore } from '@/stores/pingStore';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useSendPing } from '@/hooks/useSendPing';
import { usePingAnimation } from '@/hooks/usePingAnimation';
import { PingButton } from '@/components/ping/PingButton';
import { PartnerPulse } from '@/components/ping/PartnerPulse';
import { PhotoMomentSlot } from '@/components/ping/PhotoMomentSlot';
import { colors } from '@/constants/colors';
import { shadows } from '@/constants/shadows';

const HEADER_CIRCLE = {
  width: 38,
  height: 38,
  borderRadius: 19,
  backgroundColor: 'rgba(255,255,255,0.72)',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: shadows.headerCircle,
} as const;

/**
 * The only screen that matters. Wordless by design — no status text and no
 * instructional copy, because the vessel animation is the confirmation.
 */
export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const partnerProfile = useProfileStore((s) => s.partnerProfile);
  const pingStatus = usePingStore((s) => s.pingStatus);
  const offlineQueue = usePingStore((s) => s.offlineQueue);
  const { isConnected } = useNetworkStatus();
  const { sendPing } = useSendPing();

  const [momentUri, setMomentUri] = useState<string | undefined>();

  const handleSend = useCallback(() => {
    void sendPing({ momentUri });
    setMomentUri(undefined);
  }, [sendPing, momentUri]);

  // Owned here rather than inside PingButton so the header ring can ride the
  // same values.
  const animation = usePingAnimation({
    onSend: handleSend,
    onEarlyRelease: () => {
      // The haptic is the whole response — nothing sends.
    },
    disabled: pingStatus === 'sending',
  });

  const pickFromLibrary = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled && result.assets[0]) setMomentUri(result.assets[0].uri);
  }, []);

  const takePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled && result.assets[0]) setMomentUri(result.assets[0].uri);
  }, []);

  // The design collapses the old gallery/camera pair into one button, so the
  // choice moves into a sheet rather than being dropped.
  const handlePickPhoto = useCallback(() => {
    Alert.alert(t('home.sendMoment'), undefined, [
      { text: t('home.takePhoto'), onPress: () => void takePhoto() },
      { text: t('home.chooseFromLibrary'), onPress: () => void pickFromLibrary() },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  }, [takePhoto, pickFromLibrary, t]);

  return (
    <View
      className="flex-1 bg-imm-bg"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      {/* Header */}
      <View className="flex-row items-center justify-between" style={{ paddingHorizontal: 22, paddingVertical: 12 }}>
        <View className="flex-row items-center" style={{ gap: 11 }}>
          <PartnerPulse
            uri={partnerProfile?.avatar_url}
            name={partnerProfile?.username}
            burst={animation.burst}
          />
          <View>
            <Text className="font-display text-imm-text" style={{ fontSize: 17, lineHeight: 20 }}>
              {partnerProfile?.username ?? ''}
            </Text>
            {isConnected === false && (
              <Text className="font-nunito text-imm-muted" style={{ fontSize: 11 }}>
                {offlineQueue.length > 0
                  ? t('home.offlineWaiting', { n: offlineQueue.length })
                  : t('home.offlineLater')}
              </Text>
            )}
          </View>
        </View>

        <View className="flex-row items-center" style={{ gap: 8 }}>
          <Pressable
            onPress={() => router.push('/(home)/thread')}
            hitSlop={12}
            accessibilityLabel={t('home.history')}
            style={HEADER_CIRCLE}
          >
            {/* Three stacked bars */}
            <View style={{ gap: 3, alignItems: 'flex-start' }}>
              {[14, 14, 9].map((width, i) => (
                <View
                  key={i}
                  style={{ width, height: 1.5, borderRadius: 2, backgroundColor: colors.muted }}
                />
              ))}
            </View>
          </Pressable>

          <Pressable
            onPress={() => router.push('/(home)/settings')}
            hitSlop={12}
            accessibilityLabel={t('home.settings')}
            style={HEADER_CIRCLE}
          >
            <View
              style={{
                width: 13,
                height: 13,
                borderRadius: 6.5,
                borderWidth: 1.5,
                borderColor: colors.muted,
              }}
            />
          </Pressable>
        </View>
      </View>

      {/* The vessel */}
      <View className="flex-1 items-center justify-center">
        <PingButton animation={animation} />
      </View>

      {/* Photo moment */}
      <View style={{ paddingBottom: 10 }}>
        <PhotoMomentSlot
          uri={momentUri}
          onPick={handlePickPhoto}
          onRemove={() => setMomentUri(undefined)}
        />
      </View>
    </View>
  );
}
