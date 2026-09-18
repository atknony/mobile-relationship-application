import { View, Text, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { shadows } from '@/constants/shadows';

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
  const { t } = useTranslation();

  const handleCopy = async () => {
    await Clipboard.setStringAsync(code);
    showToast(t('pair.copied'), 'success');
    onShared?.();
  };

  const handleShare = async () => {
    const result = await Share.share({
      message: t('pair.shareMessage', { code }),
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
        boxShadow: shadows.cardTall,
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
            {t('pair.copy')}
          </Button>
        </View>
        <View style={{ flex: 1 }}>
          <Button onPress={handleShare}>{t('pair.share')}</Button>
        </View>
      </View>
    </View>
  );
}
