import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  type TextInput as RNTextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { isDevShorthand, signInDevUser } from '@/lib/devUsers';
import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';
import { useToast } from '@/components/ui/Toast';
import { useAppStore } from '@/stores/appStore';
import { gradients } from '@/constants/colors';

export default function PhoneScreen() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const inputRef = useRef<RNTextInput>(null);
  const isRevealed = useAppStore((s) => s.isRevealed);

  // Not `autoFocus`: at launch this screen can mount under the startup cover
  // while the guard is still on its way to (home), and the keyboard — a system
  // window — pops over the cover for exactly as long as that takes. Focusing
  // from an effect keyed on the reveal covers both orders: mounting before the
  // app is revealed, and being navigated to once it already is.
  useEffect(() => {
    if (isRevealed) inputRef.current?.focus();
  }, [isRevealed]);

  const handleSendOtp = async () => {
    const cleaned = phone.trim().replace(/\s/g, '');

    // Dev-only shortcut: "01" / "02" sign in as the seeded test accounts, so
    // both sides of the pairing flow can be driven without an SMS provider.
    if (isDevShorthand(cleaned)) {
      setLoading(true);
      const message = await signInDevUser(cleaned);
      setLoading(false);
      if (message) showToast(message, 'error');
      return;
    }

    if (!cleaned.startsWith('+') || cleaned.length < 8) {
      showToast(t('auth.phoneInvalid'), 'error');
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
            {t('auth.tagline')}
          </Text>
        </View>

        <View style={{ gap: 16 }}>
          <TextInput
            label={t('auth.phoneLabel')}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder={t('auth.phonePlaceholder')}
            ref={inputRef}
          />
          <Button onPress={handleSendOtp} loading={loading}>
            {t('common.continue')}
          </Button>
          <Text className="font-nunito text-imm-muted text-center" style={{ fontSize: 12 }}>
            {t('auth.phonePrivacy')}
          </Text>
          {__DEV__ ? (
            <Text className="font-nunito text-imm-muted text-center" style={{ fontSize: 11, opacity: 0.7 }}>
              {t('auth.devHint')}
            </Text>
          ) : null}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
