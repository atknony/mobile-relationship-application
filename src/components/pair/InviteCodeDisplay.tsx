import { View, Text, Pressable } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useToast } from '@/components/ui/Toast';

interface InviteCodeDisplayProps {
  code: string;
}

export function InviteCodeDisplay({ code }: InviteCodeDisplayProps) {
  const { showToast } = useToast();

  const handleCopy = async () => {
    await Clipboard.setStringAsync(code);
    showToast('Code copied!', 'success');
  };

  return (
    <View className="items-center gap-4">
      <Pressable onPress={handleCopy} className="items-center gap-2">
        <View className="bg-white rounded-3xl px-10 py-6">
          <Text className="font-nunito-extrabold text-imm-text text-4xl tracking-widest">
            {code}
          </Text>
        </View>
        <Text className="font-nunito text-imm-muted text-sm">tap to copy</Text>
      </Pressable>
    </View>
  );
}
