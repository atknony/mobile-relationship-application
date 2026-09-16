import { useEffect } from 'react';
import { View, Text } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '@/components/ui/Button';
import { RadialGlow } from '@/components/ping/vessel/RadialGlow';
import { gradients } from '@/constants/colors';

const WASH = 560;
const POLL_MS = 5000;

const WASH_STOPS = [
  { offset: '0%', color: '#74B9FF', opacity: 0.4 },
  { offset: '66%', color: '#74B9FF', opacity: 0 },
];

/**
 * After sharing a code there was previously no feedback at all — you were left
 * on the invite screen wondering whether anything had happened.
 *
 * Nothing pushes pair activation to the requester: their own profile row changes
 * server-side when the other person redeems, and the app has no Realtime
 * subscription on profiles. So this polls the profile query while it is on
 * screen; the auth guard takes over the moment partner_id lands.
 */
export function WaitingForPartner({ onResend }: { onResend: () => void }) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const id = setInterval(() => {
      void queryClient.invalidateQueries({ queryKey: ['profile'] });
    }, POLL_MS);
    return () => clearInterval(id);
  }, [queryClient]);

  return (
    <View className="items-center" style={{ gap: 26 }}>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: WASH,
          height: WASH,
          top: -WASH / 3,
          opacity: 0.7,
        }}
      >
        <RadialGlow id="waitingWash" size={WASH} stops={WASH_STOPS} />
      </View>

      {/* Two people, not yet joined */}
      <View
        className="flex-row items-center justify-center"
        style={{ width: 200, height: 120, gap: 14 }}
      >
        <LinearGradient
          colors={[...gradients.warmOrb]}
          locations={[...gradients.warmOrbStops]}
          start={{ x: 0.34, y: 0.28 }}
          end={{ x: 1, y: 1 }}
          style={{ width: 56, height: 56, borderRadius: 28 }}
        />

        <View className="flex-row items-center" style={{ gap: 6 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <View
              key={i}
              style={{ width: 5, height: 1.5, backgroundColor: 'rgba(45,27,105,0.3)' }}
            />
          ))}
        </View>

        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: 'rgba(255,255,255,0.7)',
            borderWidth: 1.5,
            borderStyle: 'dashed',
            borderColor: 'rgba(116,185,255,0.7)',
          }}
        />
      </View>

      <View className="items-center" style={{ gap: 10 }}>
        <Text className="font-display text-imm-text text-center" style={{ fontSize: 28 }}>
          Waiting for them
        </Text>
        <Text
          className="font-nunito text-imm-muted text-center"
          style={{ fontSize: 15, maxWidth: 250 }}
        >
          The moment they enter your code, this becomes the only screen you need.
        </Text>
      </View>

      <Button variant="secondary" onPress={onResend}>
        Send the code again
      </Button>
    </View>
  );
}
