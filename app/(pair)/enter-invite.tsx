import { View, Text, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { InviteCodeInput } from '@/components/pair/InviteCodeInput';
import { useInviteCode } from '@/hooks/useInviteCode';
import { useToast } from '@/components/ui/Toast';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function EnterInviteScreen() {
  const { redeemCode } = useInviteCode();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();

  const handleComplete = async (code: string) => {
    try {
      await redeemCode.mutateAsync(code);
      // On success, profileStore.setPairedWith fires → root layout redirects to /(home)/
    } catch {
      showToast('Invalid or expired code. Try again.', 'error');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <View
        className="flex-1 bg-imm-bg px-6 justify-center gap-8"
        style={{ paddingBottom: insets.bottom + 24, paddingTop: insets.top + 24 }}
      >
        <View className="gap-2">
          <Text className="font-nunito-bold text-imm-text text-2xl">
            Enter their code
          </Text>
          <Text className="font-nunito text-imm-muted">
            Ask your partner to share their 6-character invite code.
          </Text>
        </View>

        {redeemCode.isPending ? (
          <LoadingSpinner />
        ) : (
          <InviteCodeInput onComplete={handleComplete} />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
