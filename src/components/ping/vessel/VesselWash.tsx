import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { RadialGlow } from './RadialGlow';
import { SURGE_SPAN, WASH_SIZE, ZONE } from '@/constants/vessel';

const STOPS = [
  { offset: '0%', color: '#FF6B6B', opacity: 0.7 },
  { offset: '38%', color: '#E0475F', opacity: 0.35 },
  { offset: '72%', color: '#E0475F', opacity: 0 },
];

/** The heat behind the vessel — grows and brightens with the hold, floods on release. */
export function VesselWash({ p, burst }: { p: SharedValue<number>; burst: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const surge =
      burst.value > 0 ? Math.sin(Math.min(burst.value / SURGE_SPAN, 1) * Math.PI) : 0;
    return {
      opacity: 0.1 + p.value * 0.5 + surge * 0.42,
      // During the burst the wash expands on the release clock, not the charge.
      transform: [
        { scale: burst.value > 0 ? 0.7 + burst.value * 0.5 : 0.7 + p.value * 0.22 },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        style,
        {
          position: 'absolute',
          width: WASH_SIZE,
          height: WASH_SIZE,
          // Centred horizontally on the zone and biased low (54%), as the design
          // places it — not on the zone's origin.
          left: ZONE / 2 - WASH_SIZE / 2,
          top: ZONE * 0.54 - WASH_SIZE / 2,
        },
      ]}
    >
      <RadialGlow id="vesselWash" size={WASH_SIZE} stops={STOPS} />
    </Animated.View>
  );
}
