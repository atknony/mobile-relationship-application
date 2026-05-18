import { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';
import { useToast } from '@/components/ui/Toast';

export default function VerifyScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();

  const handleVerify = async () => {
    if (otp.length < 4) {
      showToast('Enter the code we sent you', 'error');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      phone: phone ?? '',
      token: otp.trim(),
      type: 'sms',
    });
    setLoading(false);

    if (error) {
      showToast('Invalid code. Try again.', 'error');
    }
    // On success, useSupabaseSession fires and the root layout redirects automatically
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
            Enter the code
          </Text>
          <Text className="font-nunito text-imm-muted">
            Sent to {phone}
          </Text>
        </View>

        <View className="gap-4">
          <TextInput
            label="Verification code"
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            placeholder="123456"
            maxLength={6}
            autoFocus
          />
          <Button onPress={handleVerify} loading={loading}>
            Verify
          </Button>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
