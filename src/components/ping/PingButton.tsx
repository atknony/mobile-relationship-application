import { View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import type { PingAnimation } from '@/hooks/usePingAnimation';
import { VesselBloom } from './vessel/VesselBloom';
import { VesselBody } from './vessel/VesselBody';
import { VesselBraces } from './vessel/VesselBraces';
import { VesselGauge } from './vessel/VesselGauge';
import { VesselSparks } from './vessel/VesselSparks';
import { VesselWash } from './vessel/VesselWash';
import { VESSEL_SIZE, ZONE } from '@/constants/vessel';

/**
 * Hold to send. The vessel fills under pressure, overflows on release and eases
 * back to rest — the screen is wordless, so this animation is the only feedback
 * that a ping went.
 *
 * The animation is owned by the screen rather than created here, so the header's
 * pulse ring can ride the same charge value. Layers paint back to front, and the
 * sparks sit outside the vessel so they are not clipped when they leave frame.
 */
export function PingButton({ animation }: { animation: PingAnimation }) {
  const { p, burst, ready, clock, gesture, reducedMotion } = animation;

  return (
    <View style={{ width: ZONE, height: ZONE, alignItems: 'center', justifyContent: 'center' }}>
      <VesselWash p={p} burst={burst} />
      <VesselBraces p={p} />
      <VesselGauge p={p} ready={ready} />
      <VesselBloom burst={burst} reducedMotion={reducedMotion} />
      {!reducedMotion && <VesselSparks burst={burst} />}

      <GestureDetector gesture={gesture}>
        <View
          style={{
            width: VESSEL_SIZE,
            height: VESSEL_SIZE,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <VesselBody
            p={p}
            burst={burst}
            ready={ready}
            clock={clock}
            reducedMotion={reducedMotion}
          />
        </View>
      </GestureDetector>
    </View>
  );
}
