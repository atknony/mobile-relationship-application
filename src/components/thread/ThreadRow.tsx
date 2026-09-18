import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MomentPhoto } from '@/components/ui/MomentPhoto';
import { colors } from '@/constants/colors';
import { shadows } from '@/constants/shadows';
import type { ThreadPing } from '@/hooks/useMomentsThread';

function PingTime({ ping }: { ping: ThreadPing }) {
  const { t, i18n } = useTranslation();
  return (
    <Text className="font-nunito text-imm-muted" style={{ fontSize: 12 }}>
      {ping.queued
        ? t('thread.queued')
        : new Date(ping.createdAt).toLocaleTimeString(i18n.language, {
            hour: 'numeric',
            minute: '2-digit',
          })}
    </Text>
  );
}

/** Colour carries who sent what throughout the app: warm is you, cool is them. */
function DotChip({ mine, queued }: { mine: boolean; queued?: boolean }) {
  const dot = queued ? colors.muted : mine ? colors.mine : colors.theirs;
  const bg = queued
    ? 'rgba(45,27,105,0.08)'
    : mine
      ? 'rgba(255,122,107,0.16)'
      : 'rgba(116,185,255,0.22)';
  return (
    <View
      style={{
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dot }} />
    </View>
  );
}

function SenderName({ mine, name }: { mine: boolean; name?: string | null }) {
  // Their name is set in Newsreader italic, yours is plain — the typeface
  // itself distinguishes the two people.
  const { t } = useTranslation();
  return mine ? (
    <Text className="font-nunito text-imm-text" style={{ fontSize: 15 }}>
      {t('thread.you')}
    </Text>
  ) : (
    <Text className="font-display text-imm-text" style={{ fontSize: 15 }}>
      {name ?? t('thread.them')}
    </Text>
  );
}

export function ThreadPingRow({
  ping,
  partnerName,
}: {
  ping: ThreadPing;
  partnerName?: string | null;
}) {
  if (!ping.photoPath) {
    // A bare ping is a single line — no card.
    return (
      <View className="flex-row items-center" style={{ gap: 10 }}>
        <DotChip mine={ping.mine} queued={ping.queued} />
        <SenderName mine={ping.mine} name={partnerName} />
        <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(45,27,105,0.07)' }} />
        <PingTime ping={ping} />
      </View>
    );
  }

  return (
    <View style={{ gap: 8 }}>
      <View className="flex-row items-center" style={{ gap: 10 }}>
        <DotChip mine={ping.mine} queued={ping.queued} />
        <SenderName mine={ping.mine} name={partnerName} />
        <View style={{ flex: 1 }} />
        <PingTime ping={ping} />
      </View>
      <MomentPhoto
        path={ping.photoPath}
        height={208}
        borderRadius={24}
        boxShadow={shadows.photo}
      />
    </View>
  );
}

export function ThreadDayDivider({ label }: { label: string }) {
  return (
    <View className="flex-row items-center" style={{ gap: 10, paddingTop: 6 }}>
      <Text
        className="font-nunito text-imm-muted"
        style={{ fontSize: 11, letterSpacing: 1.8 }}
      >
        {label}
      </Text>
      <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(45,27,105,0.1)' }} />
    </View>
  );
}
