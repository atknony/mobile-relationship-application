import { View, Text, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { clearPushToken } from '@/hooks/usePushRegistration';
import { useProfileStore } from '@/stores/profileStore';
import { Avatar } from '@/components/ui/Avatar';
import { UnpairInitiator } from '@/components/unpair/UnpairInitiator';
import { UnpairPendingBanner } from '@/components/unpair/UnpairPendingBanner';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const ownProfile = useProfileStore((s) => s.ownProfile);
  const partnerProfile = useProfileStore((s) => s.partnerProfile);

  const handleSignOut = async () => {
    // Clear the push token first — once signed out, RLS blocks the write and
    // this device would keep receiving pings meant for the next user.
    if (ownProfile?.id) await clearPushToken(ownProfile.id);
    await supabase.auth.signOut();
    // useSupabaseSession fires → clears all stores → root layout redirects to /(auth)/phone
  };

  return (
    <ScrollView
      className="flex-1 bg-imm-bg"
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingBottom: insets.bottom + 24,
        paddingHorizontal: 24,
        gap: 24,
      }}
    >
      {/* Header */}
      <View className="flex-row items-center justify-between">
        <Text className="font-nunito-bold text-imm-text text-xl">Settings</Text>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text className="font-nunito text-imm-blue">Done</Text>
        </Pressable>
      </View>

      {/* Own profile */}
      <View className="bg-white rounded-3xl p-5 gap-4">
        <Text className="font-nunito-semibold text-imm-muted text-sm uppercase tracking-wider">
          You
        </Text>
        <View className="flex-row items-center gap-3">
          <Avatar
            uri={ownProfile?.avatar_url}
            name={ownProfile?.username}
            size={48}
          />
          <View>
            <Text className="font-nunito-bold text-imm-text">
              {ownProfile?.username}
            </Text>
          </View>
        </View>
      </View>

      {/* Partner profile */}
      {partnerProfile && (
        <View className="bg-white rounded-3xl p-5 gap-4">
          <Text className="font-nunito-semibold text-imm-muted text-sm uppercase tracking-wider">
            Your person
          </Text>
          <View className="flex-row items-center gap-3">
            <Avatar
              uri={partnerProfile.avatar_url}
              name={partnerProfile.username}
              size={48}
            />
            <View>
              <Text className="font-nunito-bold text-imm-text">
                {partnerProfile.username}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Unpair pending banner */}
      <UnpairPendingBanner />

      {/* Danger zone */}
      <View className="gap-3">
        <UnpairInitiator />
        <Pressable onPress={handleSignOut} className="items-center py-3">
          <Text className="font-nunito text-imm-muted text-sm">Sign out</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
