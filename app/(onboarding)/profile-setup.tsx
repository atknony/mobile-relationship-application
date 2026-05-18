import { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useProfileStore } from '@/stores/profileStore';
import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';
import { useToast } from '@/components/ui/Toast';
import type { Profile } from '@/types/database';

export default function ProfileSetupScreen() {
  const [displayName, setDisplayName] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const userId = useAuthStore((s) => s.user?.id);
  const setOwnProfile = useProfileStore((s) => s.setOwnProfile);
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();

  const handleSave = async () => {
    const name = displayName.trim();
    if (!name || !userId) {
      showToast('Enter a name to continue', 'error');
      return;
    }

    setLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('profiles')
      .upsert({
        id: userId,
        display_name: name,
        full_name: fullName.trim() || name,
      })
      .select()
      .single();
    setLoading(false);

    if (error) {
      showToast('Could not save profile. Try again.', 'error');
      return;
    }

    setOwnProfile(data as Profile);
    // Root layout detects ownProfile set and redirects to /(pair)/create-invite
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <View
        className="flex-1 bg-imm-bg px-6 justify-center gap-8"
        style={{ paddingBottom: insets.bottom + 24 }}
      >
        <View className="gap-2">
          <Text className="font-nunito-bold text-imm-text text-2xl">
            What should we call you?
          </Text>
          <Text className="font-nunito text-imm-muted">
            Your partner will see this name.
          </Text>
        </View>

        <View className="gap-4">
          <TextInput
            label="Display name"
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="e.g. Ata"
            maxLength={32}
            autoFocus
          />
          <TextInput
            label="Full name (optional)"
            value={fullName}
            onChangeText={setFullName}
            placeholder="e.g. Ata Onay"
            maxLength={64}
          />
          <Button onPress={handleSave} loading={loading}>
            Continue
          </Button>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
