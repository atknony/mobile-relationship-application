import { useState } from 'react';
import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { InviteCodeDisplay } from '@/components/pair/InviteCodeDisplay';
import { WaitingForPartner } from '@/components/pair/WaitingForPartner';
import { SignOutLink } from '@/components/ui/SignOutLink';
import { useInviteCode } from '@/hooks/useInviteCode';
import { useToast } from '@/components/ui/Toast';
import { colors } from '@/constants/colors';

export default function CreateInviteScreen() {
  const [code, setCode] = useState<string | null>(null);
  const [shared, setShared] = useState(false);
  const { generateCode } = useInviteCode();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { t } = useTranslation();

  const handleGenerate = async () => {
    try {
      setCode(await generateCode.mutateAsync());
      setShared(false);
    } catch {
      showToast(t('pair.generateFailed'), 'error');
    }
  };

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
      <View className="flex-1 justify-center" style={{ gap: 32 }}>
        {shared && code ? (
          <WaitingForPartner onResend={() => setShared(false)} />
        ) : (
          <>
            <View style={{ gap: 10 }}>
              <Text className="font-display text-imm-text" style={{ fontSize: 32 }}>
                {t('pair.inviteTitle')}
              </Text>
              <Text className="font-nunito text-imm-muted" style={{ fontSize: 15 }}>
                {code
                  ? t('pair.inviteWithCode')
                  : t('pair.inviteWithoutCode')}
              </Text>
            </View>

            <View className="items-center" style={{ gap: 22 }}>
              {code ? (
                <InviteCodeDisplay code={code} onShared={() => setShared(true)} />
              ) : (
                <View style={{ width: '100%' }}>
                  <Button onPress={handleGenerate} loading={generateCode.isPending}>
                    {t('pair.generate')}
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
                  <Button variant="secondary">{t('pair.haveCode')}</Button>
                </Link>
              </View>
            </View>
          </>
        )}
      </View>

      <SignOutLink />
    </View>
  );
}
