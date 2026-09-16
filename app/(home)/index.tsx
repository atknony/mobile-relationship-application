import { useCallback, useState } from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useProfileStore } from '@/stores/profileStore';
import { usePingStore } from '@/stores/pingStore';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useSendPing } from '@/hooks/useSendPing';
import { PingButton } from '@/components/ping/PingButton';
import { Avatar } from '@/components/ui/Avatar';
import { MAX_QUEUED_PINGS } from '@/constants/timing';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const partnerProfile = useProfileStore((s) => s.partnerProfile);
  const ownProfile = useProfileStore((s) => s.ownProfile);
  const pingStatus = usePingStore((s) => s.pingStatus);
  const offlineQueue = usePingStore((s) => s.offlineQueue);
  const { isConnected } = useNetworkStatus();
  const { sendPing } = useSendPing();

  const [momentUri, setMomentUri] = useState<string | undefined>();

  const handlePickPhoto = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled && result.assets[0]) {
      setMomentUri(result.assets[0].uri);
    }
  }, []);

  const handleCameraPhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled && result.assets[0]) {
      setMomentUri(result.assets[0].uri);
    }
  }, []);

  const handleSend = useCallback(async () => {
    await sendPing({ momentUri });
    setMomentUri(undefined);
  }, [sendPing, momentUri]);

  const partnerName = partnerProfile?.username ?? '...';

  return (
    <View
      className="flex-1 bg-imm-bg"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-4">
        <View className="flex-row items-center gap-3">
          <Avatar
            uri={partnerProfile?.avatar_url}
            name={partnerProfile?.username}
            size={40}
          />
          <View>
            <Text className="font-nunito-bold text-imm-text text-base">
              {partnerName}
            </Text>
            {isConnected === false && (
              <Text className="font-nunito text-imm-coral text-xs">offline</Text>
            )}
          </View>
        </View>

        <Pressable onPress={() => router.push('/(home)/settings')} hitSlop={12}>
          <Text className="text-2xl">⚙️</Text>
        </Pressable>
      </View>

      {/* Offline badge */}
      {offlineQueue.length > 0 && (
        <View className="mx-6 mb-2 bg-imm-muted/20 rounded-2xl px-4 py-2">
          <Text className="font-nunito text-imm-muted text-xs text-center">
            {offlineQueue.length} ping{offlineQueue.length > 1 ? 's' : ''} queued — will send when back online
          </Text>
        </View>
      )}

      {/* Main area */}
      <View className="flex-1 items-center justify-center gap-10">
        {/* Status text */}
        <View className="items-center gap-1">
          {pingStatus === 'sent' ? (
            <Text className="font-nunito-semibold text-imm-blue text-base">
              ping sent 💙
            </Text>
          ) : pingStatus === 'failed' ? (
            <Text className="font-nunito-semibold text-imm-coral text-base">
              couldn&apos;t send — we&apos;ll keep trying
            </Text>
          ) : (
            <Text className="font-nunito text-imm-muted text-base">
              let them know you&apos;re thinking of them
            </Text>
          )}
        </View>

        {/* Ping button */}
        <PingButton
          onSend={handleSend}
          disabled={isConnected === false && offlineQueue.length >= MAX_QUEUED_PINGS}
        />

        {/* Photo moment section */}
        <View className="items-center gap-3">
          {momentUri ? (
            <View className="items-center gap-2">
              <Image
                source={{ uri: momentUri }}
                className="w-48 rounded-2xl"
                style={{ height: 128 }}
                resizeMode="cover"
              />
              <Pressable onPress={() => setMomentUri(undefined)}>
                <Text className="font-nunito text-imm-muted text-xs">remove</Text>
              </Pressable>
            </View>
          ) : (
            <View className="flex-row gap-4">
              <Pressable onPress={handlePickPhoto} className="items-center gap-1">
                <Text className="text-2xl">🖼️</Text>
                <Text className="font-nunito text-imm-muted text-xs">gallery</Text>
              </Pressable>
              <Pressable onPress={handleCameraPhoto} className="items-center gap-1">
                <Text className="text-2xl">📷</Text>
                <Text className="font-nunito text-imm-muted text-xs">camera</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}
