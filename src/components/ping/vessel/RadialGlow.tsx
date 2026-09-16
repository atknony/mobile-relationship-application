import Svg, { Defs, RadialGradient, Stop, Circle, Ellipse } from 'react-native-svg';

interface GlowStop {
  offset: string;
  color: string;
  opacity: number;
}

interface RadialGlowProps {
  size: number;
  stops: GlowStop[];
  /** Height for an elliptical glow; defaults to a circle. */
  height?: number;
  id: string;
}

/**
 * A CSS `radial-gradient(circle, ...)` as a static SVG layer.
 *
 * Nothing inside animates, so it rasterises once — callers wrap it in an
 * Animated.View and animate opacity/transform only, which keeps the per-frame
 * cost to compositing. React Native has no radial gradient of its own and
 * expo-linear-gradient cannot do these.
 */
export function RadialGlow({ size, stops, height, id }: RadialGlowProps) {
  const h = height ?? size;
  return (
    <Svg width={size} height={h} pointerEvents="none">
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" rx="50%" ry="50%">
          {stops.map((stop) => (
            <Stop
              key={stop.offset}
              offset={stop.offset}
              stopColor={stop.color}
              stopOpacity={stop.opacity}
            />
          ))}
        </RadialGradient>
      </Defs>
      {height ? (
        <Ellipse cx={size / 2} cy={h / 2} rx={size / 2} ry={h / 2} fill={`url(#${id})`} />
      ) : (
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${id})`} />
      )}
    </Svg>
  );
}
