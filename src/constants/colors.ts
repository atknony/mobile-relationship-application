// Mirror of tailwind.config.js imm tokens — use these in Reanimated/StyleSheet/SVG
// contexts where className strings can't be used. Keep the two in sync.
export const colors = {
  bg: '#F4EDF7',              // "ground" in the design handoff
  bgAlt: '#F1EAF4',
  surface: '#FFFFFF',
  surfaceSunk: '#F7F1FA',
  surfaceQuiet: '#F2ECF6',
  text: '#2D1B69',            // "ink"
  muted: '#6A5B94',
  blue: '#74B9FF',            // her colour
  blueLift: '#8FC4FF',
  coral: '#FF6B6B',
  warmHi: '#FFD9BC',
  warmMid: '#FFAE8E',
  warm: '#FF8A7B',
  heat: '#F2647A',
  heatDeep: '#D6425F',
  emberText: '#B0566B',       // the only warm colour used for text
  white: '#FFFFFF',
  // Semantic. Colour carries who-sent-what throughout: warm = you, cool = her.
  mine: '#FF7A6B',
  theirs: '#74B9FF',
  danger: '#B0566B',
} as const;

// Gradient stop sets, in the order the handoff specifies them.
export const gradients = {
  warmOrb: ['#FFD9BC', '#FFAE8E', '#FF8A7B', '#F2647A'],
  warmOrbStops: [0, 0.38, 0.7, 1],
  coolAvatar: ['#8FC4FF', '#74B9FF'],
  liquidFill: ['#FF8A7B', '#F2647A', '#D6425F'],
  liquidFillStops: [0, 0.55, 1],
  primaryButton: ['#FF8A7B', '#F2647A'],
} as const;
