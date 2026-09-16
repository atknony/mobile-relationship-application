import { View, Text, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { usePreferences } from '@/hooks/usePreferences';
import { useProfileStore } from '@/stores/profileStore';
import { useAuthStore } from '@/stores/authStore';
import { Avatar } from '@/components/ui/Avatar';
import { Toggle } from '@/components/ui/Toggle';
import { SignOutLink } from '@/components/ui/SignOutLink';
import { UnpairInitiator } from '@/components/unpair/UnpairInitiator';
import { colors, gradients } from '@/constants/colors';
import { shadows } from '@/constants/shadows';

const CARD = {
  borderRadius: 26,
  boxShadow: shadows.card,
} as const;

const HAIRLINE = { height: 1, backgroundColor: 'rgba(45,27,105,0.07)' } as const;

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

  const since = pairedSince
    ? new Date(pairedSince).toLocaleDateString(undefined, { day: 'numeric', month: 'long' })
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
          Settings
        </Text>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityLabel="Close"
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
          <LinearGradient
            colors={[...gradients.warmOrb]}
            locations={[...gradients.warmOrbStops]}
            start={{ x: 0.34, y: 0.28 }}
            end={{ x: 1, y: 1 }}
            style={{ width: 52, height: 52, borderRadius: 26 }}
          />
          <View style={{ flex: 1 }}>
            <Text className="font-nunito-semibold text-imm-text" style={{ fontSize: 17 }}>
              {ownProfile?.username ?? ''}
            </Text>
            {phone ? (
              <Text className="font-nunito text-imm-muted" style={{ fontSize: 12 }}>
                {phone}
              </Text>
            ) : null}
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
                    together since {since}
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
        <PreferenceRow label="Vibrate on arrival">
          <Toggle value={vibrate} onChange={setVibrate} label="Vibrate on arrival" />
        </PreferenceRow>
      </View>

      <View style={{ alignItems: 'center', paddingTop: 4 }}>
        <SignOutLink />
        <UnpairInitiator />
      </View>
    </ScrollView>
  );
}
