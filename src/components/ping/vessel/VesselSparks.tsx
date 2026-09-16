import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { SPARKS, SPARK_LAYER_HEIGHT, SPARK_SPAN, ZONE } from '@/constants/vessel';

function Spark({
  burst,
  spark,
}: {
  burst: SharedValue<number>;
  spark: (typeof SPARKS)[number];
}) {
  const style = useAnimatedStyle(() => {
    if (burst.value <= 0) return { opacity: 0, transform: [{ translateX: 0 }, { translateY: 0 }, { scale: 1 }] };
    const pi = Math.max(0, Math.min((burst.value - spark.delay) / SPARK_SPAN, 1));
    if (pi <= 0) return { opacity: 0, transform: [{ translateX: 0 }, { translateY: 0 }, { scale: 1 }] };
    const ease = 1 - Math.pow(1 - pi, 2.2);
    return {
      opacity: Math.min(pi * 6, 1) * (1 - Math.pow(pi, 1.8)),
      transform: [
        { translateX: spark.dir * spark.xMax * ease },
        { translateY: spark.yMax * ease },
        { scale: 1 - pi * 0.45 },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        style,
        {
          position: 'absolute',
          width: spark.size,
          height: spark.size,
          borderRadius: spark.size / 2,
          backgroundColor: spark.color,
        },
      ]}
    />
  );
}

/**
 * Nine sparks thrown upward out of frame on release — the ping leaving toward
 * her. They live in their own tall layer, as siblings of the vessel rather than
 * children, so the vessel's clipping never cuts them off.
 *
 * Plain views rather than SVG circles: transform and opacity on a view stay on
 * the UI thread without routing through the SVG shadow-node path each frame.
 */
export function VesselSparks({ burst }: { burst: SharedValue<number> }) {
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: ZONE,
        height: SPARK_LAYER_HEIGHT,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingBottom: ZONE / 2,
      }}
    >
      {SPARKS.map((spark, i) => (
        <Spark key={i} burst={burst} spark={spark} />
      ))}
    </Animated.View>
  );
}
