import { useState } from 'react';
import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { InviteCodeDisplay } from '@/components/pair/InviteCodeDisplay';
import { WaitingForPartner } from '@/components/pair/WaitingForPartner';
import { useInviteCode } from '@/hooks/useInviteCode';
import { useToast } from '@/components/ui/Toast';
import { colors } from '@/constants/colors';

export default function CreateInviteScreen() {
  const [code, setCode] = useState<string | null>(null);
  const [shared, setShared] = useState(false);
  const { generateCode } = useInviteCode();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();

  const handleGenerate = async () => {
    try {
      setCode(await generateCode.mutateAsync());
      setShared(false);
    } catch {
      showToast('Could not generate a code. Try again.', 'error');
    }
  };

  return (
    <View
      className="flex-1 bg-imm-bg justify-center"
      style={{
        paddingHorizontal: 26,
        paddingBottom: insets.bottom + 24,
        paddingTop: insets.top + 24,
        gap: 32,
      }}
    >
      {shared && code ? (
        <WaitingForPartner onResend={() => setShared(false)} />
      ) : (
        <>
          <View style={{ gap: 10 }}>
            <Text className="font-display text-imm-text" style={{ fontSize: 32 }}>
              Invite your person
            </Text>
            <Text className="font-nunito text-imm-muted" style={{ fontSize: 15 }}>
              {code
                ? 'Send them this code. It works once, and expires in 15 minutes.'
                : 'Generate a code and share it with them, or enter theirs.'}
            </Text>
          </View>

          <View className="items-center" style={{ gap: 22 }}>
            {code ? (
              <InviteCodeDisplay code={code} onShared={() => setShared(true)} />
            ) : (
              <View style={{ width: '100%' }}>
                <Button onPress={handleGenerate} loading={generateCode.isPending}>
                  Generate my code
                </Button>
              </View>
            )}

            <View className="flex-row items-center" style={{ gap: 12, width: '100%' }}>
              <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(45,27,105,0.1)' }} />
              <Text className="font-nunito" style={{ fontSize: 12, color: colors.muted }}>
                or
              </Text>
              <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(45,27,105,0.1)' }} />
            </View>

            <View style={{ width: '100%' }}>
              <Link href="/(pair)/enter-invite" asChild>
                <Button variant="secondary">I have their code</Button>
              </Link>
            </View>
          </View>
        </>
      )}
    </View>
  );
}
