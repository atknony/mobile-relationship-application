import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { shareInviteCode } from '@/lib/shareInvite';
import { colors } from '@/constants/colors';
import { shadows } from '@/constants/shadows';

const CODE_LENGTH = 6;

/** Minutes and seconds left, as m:ss — digits read the same in every language. */
function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * The code as six tiles, how long it has left, and the two things you do with
 * it. Both act in place — Copy copies and says so in a toast, Share opens the
 * system sheet — and neither moves you off this screen.
 *
 * `code` is null while the first code is being fetched: the tiles hold their
 * size so nothing shifts when it lands. `dimmed` greys it during a refresh.
 */
export function InviteCodeDisplay({
  code,
  expiresAt,
  dimmed = false,
}: {
  code: string | null;
  expiresAt: string | null;
  dimmed?: boolean;
}) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [now, setNow] = useState(() => Date.now());

  const remaining = expiresAt ? new Date(expiresAt).getTime() - now : null;
  const expired = remaining !== null && remaining <= 0;
  const usable = Boolean(code) && !expired && !dimmed;

  // A second-by-second countdown, only while there is a live code to count.
  // The first tick is immediate so a fresh code never shows a stale clock.
  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [expiresAt]);

  const handleCopy = async () => {
    if (!code) return;
    await Clipboard.setStringAsync(code);
    showToast(t('pair.copied'), 'success');
  };

  const handleShare = () => {
    if (code) void shareInviteCode(code);
  };

  const chars = code ? code.split('') : Array.from({ length: CODE_LENGTH }, () => '');

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
      <View
        className="flex-row justify-center"
        style={{ gap: 7, opacity: expired || dimmed ? 0.35 : 1 }}
        accessible
        accessibilityLabel={code ? code.split('').join(' ') : undefined}
      >
        {chars.map((char, i) => (
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

      <Text
        className="font-nunito text-center"
        style={{ fontSize: 13, color: expired ? colors.emberText : colors.muted, minHeight: 18 }}
      >
        {remaining === null
          ? ' '
          : expired
            ? t('pair.expired')
            : t('pair.expiresIn', { time: formatRemaining(remaining) })}
      </Text>

      <View className="flex-row" style={{ gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Button variant="quiet" onPress={handleCopy} disabled={!usable}>
            {t('pair.copy')}
          </Button>
        </View>
        <View style={{ flex: 1 }}>
          <Button onPress={handleShare} disabled={!usable}>
            {t('pair.share')}
          </Button>
        </View>
      </View>
    </View>
  );
}
