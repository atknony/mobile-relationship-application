import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { InviteCodeDisplay } from '@/components/pair/InviteCodeDisplay';
import { SignOutLink } from '@/components/ui/SignOutLink';
import { DeleteAccount } from '@/components/settings/DeleteAccount';
import { usePairingCode } from '@/hooks/usePairingCode';
import { colors } from '@/constants/colors';

function RefreshGlyph({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 16 16" fill="none">
      <Path
        d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 2.5v3.2h-3.2"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * Where an unpaired person lands: their code, already there.
 *
 * There used to be a step in front of it ("Invite your person" → Generate), and
 * Copy/Share swapped the screen for a separate waiting view. Both are gone —
 * the code is shown on arrival (usePairingCode reuses a live one, so reopening
 * the app never kills a code already sent), and every action here acts in
 * place. Nothing needs a "waiting" state: when the other person enters the code,
 * usePairActivation and the guard move this phone to Home on their own.
 */
export default function CreateInviteScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { invite, loading, refreshing, refresh } = usePairingCode();

  return (
    <View
      className="flex-1 bg-imm-bg"
      style={{
        paddingHorizontal: 26,
        paddingBottom: insets.bottom + 24,
        paddingTop: insets.top + 24,
      }}
    >
      {/* The content still centres; the way out sits under it. Without this the
          group was a dead end — the guard sends anyone with a profile and no
          partner straight back here, so there is no navigating out of it. */}
      <View className="flex-1 justify-center" style={{ gap: 28 }}>
        <View style={{ gap: 10 }}>
          <Text className="font-display text-imm-text" style={{ fontSize: 32 }}>
            {t('pair.codeTitle')}
          </Text>
          <Text className="font-nunito text-imm-muted" style={{ fontSize: 15 }}>
            {t('pair.inviteWithCode')}
          </Text>
        </View>

        <View className="items-center" style={{ gap: 14 }}>
          <InviteCodeDisplay
            code={invite?.code ?? null}
            expiresAt={invite?.expiresAt ?? null}
            dimmed={refreshing}
          />

          <Pressable
            onPress={() => void refresh()}
            disabled={loading || refreshing}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('pair.refresh')}
            className="flex-row items-center"
            style={({ pressed }) => ({
              gap: 6,
              paddingVertical: 8,
              opacity: loading ? 0.4 : pressed ? 0.6 : 1,
            })}
          >
            {/* A fixed box, so swapping the glyph for the spinner moves nothing. */}
            <View style={{ width: 18, height: 18, alignItems: 'center', justifyContent: 'center' }}>
              {refreshing ? (
                <ActivityIndicator
                  size="small"
                  color={colors.muted}
                  style={{ transform: [{ scale: 0.8 }] }}
                />
              ) : (
                <RefreshGlyph color={colors.muted} />
              )}
            </View>
            <Text className="font-nunito-semibold" style={{ fontSize: 14, color: colors.muted }}>
              {t('pair.refresh')}
            </Text>
          </Pressable>
        </View>

        <View style={{ gap: 18 }}>
          <View className="flex-row items-center" style={{ gap: 12, width: '100%' }}>
            <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(45,27,105,0.1)' }} />
            <Text className="font-nunito" style={{ fontSize: 12, color: colors.muted }}>
              {t('common.or')}
            </Text>
            <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(45,27,105,0.1)' }} />
          </View>

          <Link href="/(pair)/enter-invite" asChild>
            <Button variant="secondary">{t('pair.haveCode')}</Button>
          </Link>
        </View>
      </View>

      <SignOutLink />
      {/* Someone who has unpaired lands here, not in Settings — account
          deletion has to be reachable from here too (Play Store policy). */}
      <DeleteAccount />
    </View>
  );
}
