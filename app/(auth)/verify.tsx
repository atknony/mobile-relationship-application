import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { claimActiveDevice } from '@/lib/activeDevice';
import { CodeInput, type CodeInputHandle } from '@/components/ui/CodeInput';
import { useToast } from '@/components/ui/Toast';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { colors } from '@/constants/colors';

const RESEND_SECONDS = 24;

export default function VerifyScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [loading, setLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const inputRef = useRef<CodeInputHandle>(null);

  // A real countdown — previously there was no way to ask for another code.
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [secondsLeft]);

  const handleVerify = useCallback(
    async (token: string) => {
      setLoading(true);
      const { error } = await supabase.auth.verifyOtp({
        phone: phone ?? '',
        token,
        type: 'sms',
      });

      if (error) {
        setLoading(false);
        showToast(t('auth.codeInvalid'), 'error');
        return;
      }

      // Signs this account out of any other phone. On success useSupabaseSession
      // has already fired and the guard redirects.
      const claimError = await claimActiveDevice();
      setLoading(false);
      if (claimError) showToast(claimError, 'error');
    },
    [phone, showToast, t]
  );

  const handleResend = useCallback(async () => {
    if (secondsLeft > 0 || !phone) return;
    const { error } = await supabase.auth.signInWithOtp({ phone });
    if (error) {
      showToast(error.message, 'error');
      return;
    }
    setSecondsLeft(RESEND_SECONDS);
    showToast(t('auth.codeResent'), 'success');
  }, [phone, secondsLeft, showToast, t]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <View
        className="flex-1 bg-imm-bg justify-center"
        style={{
          paddingHorizontal: 26,
          paddingBottom: insets.bottom + 24,
          gap: 32,
        }}
      >
        <View style={{ gap: 10 }}>
          <Text className="font-display text-imm-text" style={{ fontSize: 32 }}>
            {t('auth.codeTitle')}
          </Text>
          <Text className="font-nunito text-imm-muted" style={{ fontSize: 15 }}>
            {t('auth.codeSentTo', { phone })}
          </Text>
        </View>

        {loading ? (
          <LoadingSpinner />
        ) : (
          <View style={{ gap: 20 }}>
            {/* The six-cell input is shared with invite entry — same shape, same states. */}
            <CodeInput ref={inputRef} mode="numeric" onComplete={handleVerify} />

            <Pressable onPress={handleResend} disabled={secondsLeft > 0} hitSlop={8}>
              <Text
                className="font-nunito text-center"
                style={{
                  fontSize: 13,
                  color: secondsLeft > 0 ? colors.muted : colors.emberText,
                }}
              >
                {secondsLeft > 0
                  ? t('auth.resendIn', { time: `0:${String(secondsLeft).padStart(2, '0')}` })
                  : t('auth.resend')}
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
