import { View, Text, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useMomentsThread, type ThreadRow } from '@/hooks/useMomentsThread';
import { BackButton } from '@/components/ui/BackButton';
import { ThreadDayDivider, ThreadPingRow } from '@/components/thread/ThreadRow';
import { useProfileStore } from '@/stores/profileStore';
import { colors } from '@/constants/colors';

const BAR_HEIGHTS = [7, 13, 5, 11, 16, 9]; // the design's resting shape

function Sparkline({ days }: { days: { mine: number; theirs: number }[] }) {
  const busiest = Math.max(1, ...days.map((d) => d.mine + d.theirs));
  return (
    <View className="flex-row items-end" style={{ gap: 3, height: 16 }}>
      {days.map((day, i) => {
        const total = day.mine + day.theirs;
        const height = total === 0 ? 4 : Math.max(4, (total / busiest) * BAR_HEIGHTS[4]);
        const color =
          total === 0
            ? 'rgba(45,27,105,0.15)'
            : day.mine >= day.theirs
              ? colors.mine
              : 'rgba(116,185,255,0.7)';
        return (
          <View
            key={i}
            style={{ width: 4, height, borderRadius: 2, backgroundColor: color }}
          />
        );
      })}
    </View>
  );
}

/**
 * The history the `moments` table has always stored and nothing ever displayed.
 */
export default function ThreadScreen() {
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const partnerProfile = useProfileStore((s) => s.partnerProfile);
  const { rows, sparkline, isLoading, error } = useMomentsThread();

  const month = new Date().toLocaleDateString(i18n.language, { month: 'long' });

  const renderRow = ({ item }: { item: ThreadRow }) =>
    item.kind === 'day' ? (
      <ThreadDayDivider label={item.label} />
    ) : (
      <ThreadPingRow ping={item.ping} partnerName={partnerProfile?.username} />
    );

  return (
    <View className="flex-1 bg-imm-bg" style={{ paddingTop: insets.top }}>
      <View
        className="flex-row items-center"
        style={{ paddingHorizontal: 22, paddingTop: 10, paddingBottom: 14 }}
      >
        <BackButton fallback="/(home)/" />

        <Text
          className="font-display text-imm-text"
          style={{ flex: 1, textAlign: 'center', fontSize: 20 }}
        >
          {month}
        </Text>

        <Sparkline days={sparkline} />
      </View>

      <FlatList
        data={rows}
        keyExtractor={(item) => item.key}
        renderItem={renderRow}
        contentContainerStyle={{
          paddingHorizontal: 22,
          paddingTop: 4,
          paddingBottom: insets.bottom + 24,
          gap: 18,
        }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          isLoading ? null : (
            // Deliberately plain: the handoff does not design an empty state and
            // asks that one not be invented.
            <Text
              className="font-nunito text-imm-muted text-center"
              style={{ fontSize: 14, paddingTop: 40 }}
            >
              {error ? t('thread.loadFailed') : t('thread.empty')}
            </Text>
          )
        }
      />
    </View>
  );
}
