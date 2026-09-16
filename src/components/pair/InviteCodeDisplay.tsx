import { View, Text, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

/**
 * The code, as six tiles, with the two things you actually do with it.
 */
export function InviteCodeDisplay({
  code,
  onShared,
}: {
  code: string;
  onShared?: () => void;
}) {
  const { showToast } = useToast();

  const handleCopy = async () => {
    await Clipboard.setStringAsync(code);
    showToast('Code copied', 'success');
    onShared?.();
  };

  const handleShare = async () => {
    const result = await Share.share({
      message: `Join me on Imm — my code is ${code}`,
    });
    if (result.action === Share.sharedAction) onShared?.();
  };

  return (
    <View
      className="bg-imm-surface"
      style={{
        borderRadius: 28,
        paddingVertical: 30,
        paddingHorizontal: 24,
        gap: 22,
        width: '100%',
        shadowColor: '#2D1B69',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.08,
        shadowRadius: 30,
        elevation: 4,
      }}
    >
      <View className="flex-row justify-center" style={{ gap: 7 }}>
        {code.split('').map((char, i) => (
          <View
            key={i}
            className="bg-imm-surface-sunk items-center justify-center"
            style={{ width: 38, height: 50, borderRadius: 12 }}
          >
            <Text className="font-nunito-bold text-imm-text" style={{ fontSize: 22 }}>
              {char}
            </Text>
          </View>
        ))}
      </View>

      <View className="flex-row" style={{ gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Button variant="quiet" onPress={handleCopy}>
            Copy
          </Button>
        </View>
        <View style={{ flex: 1 }}>
          <Button onPress={handleShare}>Share</Button>
        </View>
      </View>
    </View>
  );
}
