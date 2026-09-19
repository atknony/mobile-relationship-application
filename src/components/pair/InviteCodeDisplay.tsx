import { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import * as Clipboard from 'expo-clipboard';
import { useTranslation } from 'react-i18next';
import { shareInviteCode } from '@/lib/shareInvite';
import { colors } from '@/constants/colors';
import { shadows } from '@/constants/shadows';

const CODE_LENGTH = 6;
// How long Copy shows its checkmark before going back to "Copy".
const COPIED_FEEDBACK_MS = 1800;

function CopyGlyph({ color }: { color: string }) {
  return (
    <Svg width={17} height={17} viewBox="0 0 18 18" fill="none">
      <Rect x={6} y={6} width={9.5} height={9.5} rx={2.2} stroke={color} strokeWidth={1.7} />
      <Path
        d="M12 3.5H5A1.5 1.5 0 0 0 3.5 5v7"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function CheckGlyph({ color }: { color: string }) {
  return (
    <Svg width={17} height={17} viewBox="0 0 18 18" fill="none">
      <Path
        d="M3.5 9.5 L7.5 13.5 L14.5 4.5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ShareGlyph({ color }: { color: string }) {
  return (
    <Svg width={17} height={17} viewBox="0 0 18 18" fill="none">
      <Path
        d="M9 11V2.8M5.8 5.8 9 2.6l3.2 3.2"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M4 9.5v4.2c0 .9.7 1.6 1.6 1.6h6.8c.9 0 1.6-.7 1.6-1.6V9.5"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/**
 * Copy and Share are this one component, so they cannot drift apart: same
 * height, same half of the row, same surface. (They used to be a `quiet` and a
 * `primary` Button, which differ in padding — hence two sizes.)
 */
function CardAction({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  disabled: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => ({
        flex: 1,
        height: 52,
        borderRadius: 16,
        backgroundColor: colors.surfaceQuiet,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        opacity: disabled ? 0.45 : pressed ? 0.7 : 1,
        transform: [{ scale: pressed && !disabled ? 0.97 : 1 }],
      })}
    >
      {icon}
      {/* flexShrink/includeFontPadding: see the clipped-label gotcha in CLAUDE.md. */}
      <Text
        className="font-nunito-bold text-imm-text"
        style={{ fontSize: 15, flexShrink: 0, includeFontPadding: false }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** Minutes and seconds left, as m:ss — digits read the same in every language. */
function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * The code as six tiles, how long it has left, and the two things you do with
 * it. Both act in place — Copy flips to a checkmark, Share opens the system
 * sheet — and neither moves you off this screen.
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
  // Which code was just copied — so a refreshed code shows "Copy" again
  // without an effect having to reset anything.
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const copied = copiedCode !== null && copiedCode === code;
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

  useEffect(() => {
    if (!copiedCode) return;
    const timer = setTimeout(() => setCopiedCode(null), COPIED_FEEDBACK_MS);
    return () => clearTimeout(timer);
  }, [copiedCode]);

  const handleCopy = async () => {
    if (!code) return;
    await Clipboard.setStringAsync(code);
    setCopiedCode(code);
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
        paddingTop: 30,
        paddingBottom: 24,
        paddingHorizontal: 24,
        gap: 18,
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
        <CardAction
          icon={
            copied ? <CheckGlyph color={colors.emberText} /> : <CopyGlyph color={colors.text} />
          }
          label={copied ? t('pair.copiedShort') : t('pair.copy')}
          onPress={() => void handleCopy()}
          disabled={!usable}
        />
        <CardAction
          icon={<ShareGlyph color={colors.text} />}
          label={t('pair.share')}
          onPress={handleShare}
          disabled={!usable}
        />
      </View>
    </View>
  );
}
