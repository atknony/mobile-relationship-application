import { useRef } from 'react';
import { View, Text, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { BackButton } from '@/components/ui/BackButton';
import { CodeInput, type CodeInputHandle } from '@/components/ui/CodeInput';
import { useInviteCode } from '@/hooks/useInviteCode';
import { useToast } from '@/components/ui/Toast';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { colors } from '@/constants/colors';

export default function EnterInviteScreen() {
  const { redeemCode } = useInviteCode();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const inputRef = useRef<CodeInputHandle>(null);

  const handleComplete = async (code: string) => {
    try {
      await redeemCode.mutateAsync(code);
      // The auth guard takes over once partner_id lands.
    } catch {
      showToast('Invalid or expired code. Try again.', 'error');
    }
  };

  const handlePaste = async () => {
    const text = await Clipboard.getStringAsync();
    const clean = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (clean.length < 6) {
      showToast('No code on your clipboard.', 'info');
      return;
    }
    inputRef.current?.fill(clean);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <View
        className="flex-1 bg-imm-bg"
        style={{
          paddingHorizontal: 26,
          paddingBottom: insets.bottom + 24,
          paddingTop: insets.top + 12,
        }}
      >
        {/* This screen is only ever pushed from create-invite, so back() pops.
            The fallback covers the case where it is not — an empty history
            would otherwise make this button do nothing at all. */}
        <View className="flex-row">
          <BackButton fallback="/(pair)/create-invite" />
        </View>

        <View className="flex-1 justify-center" style={{ gap: 32 }}>
          <View style={{ gap: 10 }}>
            <Text className="font-display text-imm-text" style={{ fontSize: 32 }}>
              Their code
            </Text>
            <Text className="font-nunito text-imm-muted" style={{ fontSize: 15 }}>
              Six characters, from their phone.
            </Text>
          </View>

          {redeemCode.isPending ? (
            <LoadingSpinner />
          ) : (
            <View style={{ gap: 20 }}>
              <CodeInput ref={inputRef} onComplete={handleComplete} />

              <Pressable
                onPress={handlePaste}
                hitSlop={8}
                className="flex-row items-center justify-center"
                style={{ gap: 8 }}
              >
                <View
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 13,
                    backgroundColor: 'rgba(255,122,107,0.16)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <View
                    style={{ width: 9, height: 9, borderRadius: 4.5, backgroundColor: colors.mine }}
                  />
                </View>
                <Text className="font-nunito text-imm-muted" style={{ fontSize: 13 }}>
                  Paste from clipboard
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
