import { useState } from 'react';
import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { InviteCodeDisplay } from '@/components/pair/InviteCodeDisplay';
import { useInviteCode } from '@/hooks/useInviteCode';
import { useToast } from '@/components/ui/Toast';

export default function CreateInviteScreen() {
  const [code, setCode] = useState<string | null>(null);
  const { generateCode } = useInviteCode();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();

  const handleGenerate = async () => {
    try {
      const result = await generateCode.mutateAsync();
      setCode(result);
    } catch {
      showToast('Could not generate a code. Try again.', 'error');
    }
  };

  return (
    <View
      className="flex-1 bg-imm-bg px-6 justify-center gap-8"
      style={{ paddingBottom: insets.bottom + 24, paddingTop: insets.top + 24 }}
    >
      <View className="gap-2">
        <Text className="font-nunito-extrabold text-imm-text text-3xl">
          Connect with your person
        </Text>
        <Text className="font-nunito text-imm-muted">
          Generate a code and share it with them, or enter theirs.
        </Text>
      </View>

      <View className="gap-6 items-center">
        {code ? (
          <InviteCodeDisplay code={code} />
        ) : (
          <Button
            onPress={handleGenerate}
            loading={generateCode.isPending}
          >
            Generate my code
          </Button>
        )}

        <View className="flex-row items-center gap-3">
          <View className="flex-1 h-px bg-imm-muted/30" />
          <Text className="font-nunito text-imm-muted text-sm">or</Text>
          <View className="flex-1 h-px bg-imm-muted/30" />
        </View>

        <Link href="/(pair)/enter-invite" asChild>
          <Button variant="secondary">Enter their code</Button>
        </Link>
      </View>
    </View>
  );
}
