import { useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { usePreferences } from '@/hooks/usePreferences';
import { currentLanguage, LANGUAGE_NAMES } from '@/lib/i18n';
import { changeAvatar, pickAvatar } from '@/lib/avatar';
import { useToast } from '@/components/ui/Toast';
import { useProfileStore } from '@/stores/profileStore';
import { useAuthStore } from '@/stores/authStore';
import { Avatar } from '@/components/ui/Avatar';
import { Toggle } from '@/components/ui/Toggle';
import { LanguageSheet } from '@/components/settings/LanguageSheet';
import { SignOutLink } from '@/components/ui/SignOutLink';
import { UnpairInitiator } from '@/components/unpair/UnpairInitiator';
import { colors } from '@/constants/colors';
import { shadows } from '@/constants/shadows';

const CARD = {
  borderRadius: 26,
  boxShadow: shadows.card,
} as const;

const HAIRLINE = { height: 1, backgroundColor: 'rgba(45,27,105,0.07)' } as const;

function Chevron() {
  return (
    <View
      style={{
        width: 7,
        height: 7,
        borderTopWidth: 1.5,
        borderRightWidth: 1.5,
        borderColor: colors.muted,
        transform: [{ rotate: '45deg' }],
      }}
    />
  );
}

function CloseGlyph() {
  return (
    <View style={{ width: 11, height: 11 }}>
      {[45, -45].map((deg) => (
        <View
          key={deg}
          style={{
            position: 'absolute',
            top: 5,
            width: 11,
            height: 1.5,
            backgroundColor: colors.text,
            transform: [{ rotate: `${deg}deg` }],
          }}
        />
      ))}
    </View>
  );
}

function PreferenceRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View
      className="flex-row items-center justify-between"
      style={{ paddingVertical: 16, gap: 12 }}
    >
      <Text className="font-nunito text-imm-text" style={{ fontSize: 16 }}>
        {label}
      </Text>
      {children}
    </View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const ownProfile = useProfileStore((s) => s.ownProfile);
  const partnerProfile = useProfileStore((s) => s.partnerProfile);
  const pairedSince = useProfileStore((s) => s.pairedSince);
  const phone = useAuthStore((s) => s.user?.phone);
  const { vibrate, setVibrate } = usePreferences();
  const { showToast } = useToast();
  const { t, i18n } = useTranslation();
  const [languageSheetOpen, setLanguageSheetOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  // The photo as picked, kept on screen after the save too: it is the same
  // image, and swapping to the signed copy would blank the circle while it
  // downloads.
  const [pickedUri, setPickedUri] = useState<string | null>(null);

  const handleChangePhoto = async () => {
    if (uploading || !ownProfile) return;
    const uri = await pickAvatar();
    if (!uri) return;

    const previousUri = pickedUri;
    setPickedUri(uri);
    setUploading(true);
    try {
      await changeAvatar(ownProfile.id, uri);
    } catch {
      setPickedUri(previousUri);
      showToast(t('settings.photoFailed'), 'error');
    } finally {
      setUploading(false);
    }
  };

  const since = pairedSince
    ? new Date(pairedSince).toLocaleDateString(i18n.language, { day: 'numeric', month: 'long' })
    : null;

  return (
    <ScrollView
      className="flex-1 bg-imm-bg"
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingBottom: insets.bottom + 24,
        paddingHorizontal: 22,
        gap: 20,
      }}
    >
      <View className="flex-row items-center justify-between">
        <Text className="font-display text-imm-text" style={{ fontSize: 28 }}>
          {t('settings.title')}
        </Text>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityLabel={t('common.close')}
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: 'rgba(255,255,255,0.72)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CloseGlyph />
        </Pressable>
      </View>

      {/* People */}
      <View className="bg-imm-surface" style={[CARD, { padding: 20, gap: 18 }]}>
        <View className="flex-row items-center" style={{ gap: 14 }}>
          {/* You are warm; they are cool. The same coding as the thread. */}
          <Pressable
            onPress={handleChangePhoto}
            disabled={uploading}
            accessibilityRole="button"
            accessibilityLabel={t('settings.changePhoto')}
          >
            <Avatar
              uri={ownProfile?.avatar_url}
              localUri={pickedUri}
              name={ownProfile?.username}
              size={52}
              tone="warm"
            />
            {uploading ? (
              <View
                style={{
                  ...StyleSheet.absoluteFill,
                  borderRadius: 26,
                  backgroundColor: 'rgba(255,255,255,0.55)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ActivityIndicator size="small" color={colors.heat} />
              </View>
            ) : null}
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text className="font-nunito-semibold text-imm-text" style={{ fontSize: 17 }}>
              {ownProfile?.username ?? ''}
            </Text>
            {phone ? (
              <Text className="font-nunito text-imm-muted" style={{ fontSize: 12 }}>
                {phone}
              </Text>
            ) : null}
            <Pressable
              onPress={handleChangePhoto}
              disabled={uploading}
              hitSlop={8}
              style={{ alignSelf: 'flex-start', paddingTop: 4 }}
            >
              <Text
                className="font-nunito-semibold"
                style={{ fontSize: 13, color: colors.emberText, opacity: uploading ? 0.5 : 1 }}
              >
                {uploading
                  ? t('settings.savingPhoto')
                  : ownProfile?.avatar_url
                    ? t('settings.changePhoto')
                    : t('settings.addPhoto')}
              </Text>
            </Pressable>
          </View>
        </View>

        {partnerProfile ? (
          <>
            <View style={HAIRLINE} />
            <View className="flex-row items-center" style={{ gap: 14 }}>
              <Avatar uri={partnerProfile.avatar_url} name={partnerProfile.username} size={52} />
              <View style={{ flex: 1 }}>
                <Text className="font-display text-imm-text" style={{ fontSize: 19 }}>
                  {partnerProfile.username}
                </Text>
                {since ? (
                  <Text className="font-nunito text-imm-muted" style={{ fontSize: 12 }}>
                    {t('settings.togetherSince', { date: since })}
                  </Text>
                ) : null}
              </View>
            </View>
          </>
        ) : null}
      </View>

      {/* Preferences */}
      <View className="bg-imm-surface" style={[CARD, { paddingHorizontal: 20, paddingVertical: 6 }]}>
        {/* Quiet hours and "keep photo moments" are deliberately absent: the
            first needs server-side push gating to mean anything, the second was
            never built. Only settings that actually do something live here. */}
        {/* A row that opens a list rather than an inline switch, so a third
            language is a new locale file and nothing here changes. */}
        <Pressable
          onPress={() => setLanguageSheetOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`${t('settings.language')}, ${LANGUAGE_NAMES[currentLanguage()]}`}
          style={({ pressed }) => ({ opacity: pressed ? 0.55 : 1 })}
        >
          <PreferenceRow label={t('settings.language')}>
            <View className="flex-row items-center" style={{ gap: 10 }}>
              <Text className="font-nunito text-imm-muted" style={{ fontSize: 15 }}>
                {LANGUAGE_NAMES[currentLanguage()]}
              </Text>
              <Chevron />
            </View>
          </PreferenceRow>
        </Pressable>
        <View style={HAIRLINE} />
        <PreferenceRow label={t('settings.vibrate')}>
          <Toggle value={vibrate} onChange={setVibrate} label={t('settings.vibrate')} />
        </PreferenceRow>
      </View>

      <View style={{ alignItems: 'center', paddingTop: 4 }}>
        <SignOutLink />
        <UnpairInitiator />
      </View>

      <LanguageSheet visible={languageSheetOpen} onClose={() => setLanguageSheetOpen(false)} />
    </ScrollView>
  );
}
