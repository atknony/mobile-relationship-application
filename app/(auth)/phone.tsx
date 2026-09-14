import { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { DEMO_PHONE, enterDemoMode } from '@/lib/demoMode';
import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';
import { useToast } from '@/components/ui/Toast';

export default function PhoneScreen() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();

  const handleSendOtp = async () => {
    const cleaned = phone.trim().replace(/\s/g, '');

    // Dev-only bypass — skips the SMS provider and lands on the ping screen.
    if (__DEV__ && cleaned === DEMO_PHONE) {
      enterDemoMode();
      showToast('Demo mode — signed in with sample data', 'info');
      return;
    }

    if (!cleaned.startsWith('+') || cleaned.length < 8) {
      showToast('Enter your phone number with country code (e.g. +1...)', 'error');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ phone: cleaned });
    setLoading(false);

    if (error) {
      showToast(error.message, 'error');
      return;
    }

    router.push({ pathname: '/(auth)/verify', params: { phone: cleaned } });
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
          <Text className="font-nunito-extrabold text-imm-text text-4xl">Imm</Text>
          <Text className="font-nunito text-imm-muted text-base">
            for the two of you
          </Text>
        </View>

        <View className="gap-4">
          <TextInput
            label="Phone number"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="+1 234 567 8900"
            autoFocus
          />
          <Button onPress={handleSendOtp} loading={loading}>
            Send code
          </Button>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
