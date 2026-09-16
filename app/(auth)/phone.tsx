import { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { DEMO_PHONE, enterDemoMode } from '@/lib/demoMode';
import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';
import { useToast } from '@/components/ui/Toast';
import { gradients } from '@/constants/colors';

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
        className="flex-1 bg-imm-bg justify-center"
        style={{ paddingHorizontal: 26, paddingBottom: insets.bottom + 24, gap: 40 }}
      >
        <View style={{ gap: 16 }}>
          <LinearGradient
            colors={[...gradients.warmOrb]}
            locations={[...gradients.warmOrbStops]}
            start={{ x: 0.34, y: 0.28 }}
            end={{ x: 1, y: 1 }}
            style={{ width: 52, height: 52, borderRadius: 26 }}
          />
          <Text className="font-display text-imm-text" style={{ fontSize: 46, lineHeight: 52 }}>
            Imm
          </Text>
          <Text
            className="font-nunito text-imm-muted"
            style={{ fontSize: 17, maxWidth: 270, lineHeight: 24 }}
          >
            A quiet line between the two of you. Nothing else lives here.
          </Text>
        </View>

        <View style={{ gap: 16 }}>
          <TextInput
            label="PHONE NUMBER"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="+1 234 567 8900"
            autoFocus
          />
          <Button onPress={handleSendOtp} loading={loading}>
            Continue
          </Button>
          <Text className="font-nunito text-imm-muted text-center" style={{ fontSize: 12 }}>
            We use it once, to find your person.
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
