/**
 * Numeric contract for the send interaction, read from the design prototype
 * (`Imm - Polished.dc.html`, option 1b). The prototype drives everything from a
 * single requestAnimationFrame loop writing inline styles; these are the same
 * numbers, consumed by Reanimated worklets instead.
 *
 * Treat these as the spec — they were tuned against the prototype, not derived.
 */

// Phases of the hold. Kept as ints so a shared value can hold them.
export const PHASE_IDLE = 0;
export const PHASE_CHARGE = 1;
export const PHASE_DECAY = 2;
export const PHASE_BURST = 3;

export const DECAY_DURATION_MS = 460;   // early release, springy snap-back
export const BURST_DURATION_MS = 2400;  // release past threshold: overflow + settle

// Where the settle curve begins and ends within the burst, as a fraction of it.
export const SETTLE_START = 0.28;
export const SETTLE_SPAN = 0.66;
export const SETTLE_WOBBLE_AMPLITUDE = 0.035;
export const SETTLE_WOBBLE_CYCLES = 2.4;

export const SURGE_SPAN = 0.3;   // overflow ramps over the first 30% of the burst
export const BLOOM_SPAN = 0.46;
export const SPARK_SPAN = 0.62;
export const SPARK_STAGGER = 0.015; // per spark index

// Geometry
export const ZONE = 300;          // the interaction zone
export const VESSEL_SIZE = 164;   // also the touch target — above the 44px minimum
export const GAUGE_SIZE = 212;
export const GAUGE_STROKE = 2;
export const BLOOM_SIZE = 168;
export const WASH_SIZE = 700;
export const CORE_SIZE = 64;
export const BRACE_WIDTH = 16;
export const BRACE_HEIGHT = 120;
export const BRACE_INSET = 14;
export const MENISCUS_HEIGHT = 14;

// Fill level, as a percentage of the vessel height.
export const FILL_REST = 9;       // never quite empty
export const FILL_RANGE = 91;
export const FILL_SURGE = 58;     // overflow climbs past the rim
export const FILL_MAX = 168;
export const MENISCUS_FADE_FROM = 96;
export const MENISCUS_FADE_RANGE = 30;

// Vessel body under pressure
export const VESSEL_COMPRESS = 0.055; // it compresses under the thumb; never scales up
export const VESSEL_SURGE_SWELL = 0.14;
export const READY_SQUASH_AMPLITUDE = 0.012;
export const READY_SQUASH_FREQ = 24;

// Meniscus wobble
export const MENISCUS_WOBBLE_X_FREQ = 7.5;
export const MENISCUS_WOBBLE_X_BASE = 0.03;
export const MENISCUS_WOBBLE_X_GAIN = 0.05;
export const MENISCUS_WOBBLE_Y_FREQ = 5.3;
export const MENISCUS_WOBBLE_Y_AMPLITUDE = 0.25;

/**
 * The nine sparks. Index drives stagger, direction and travel, so the order is
 * part of the contract — do not sort or regenerate this list.
 */
export const SPARKS = [
  { size: 10, color: '#F2647A' },
  { size: 7, color: '#FF8A7B' },
  { size: 12, color: '#D6425F' },
  { size: 6, color: '#FFC4AA' },
  { size: 9, color: '#F2647A' },
  { size: 8, color: '#FF8A7B' },
  { size: 5, color: '#FFE0D2' },
  { size: 11, color: '#D6425F' },
  { size: 6, color: '#FFC4AA' },
].map((spark, i) => ({
  ...spark,
  dir: i % 2 ? 1 : -1,
  xMax: 14 + (i % 5) * 18,
  yMax: -(340 + ((i * 53) % 260) + 40),
  delay: SPARK_STAGGER * i,
}));

export const SPARK_LAYER_HEIGHT = 760; // tall enough that spark travel stays inside it
