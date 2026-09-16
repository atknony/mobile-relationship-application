/**
 * Depth is expressed as `boxShadow`, never as Android's `elevation`.
 *
 * `elevation` routes the shadow through Android's outline renderer, which on
 * these translucent white surfaces painted a hard, polygon-approximated copy of
 * the shape *inside* the control — the white octagon that showed up in every
 * round button on the ping screen. `boxShadow` (React Native 0.76+) paints the
 * same way on both platforms and takes the handoff's CSS values verbatim, so
 * these strings are the design tokens rather than a translation of them.
 *
 * Keep using these rather than re-deriving shadowOffset/Opacity/Radius triples:
 * mixing the two systems is what produced the doubled, mismatched shadows.
 */
export const shadows = {
  /** 38px header circles. */
  headerCircle: '0px 1px 4px rgba(45,27,105,0.08)',
  /** The floating camera circle above the vessel. */
  floatButton: '0px 2px 10px rgba(45,27,105,0.08)',
  /** Settings / invite cards. */
  card: '0px 6px 22px rgba(45,27,105,0.07)',
  cardTall: '0px 10px 30px rgba(45,27,105,0.08)',
  cardLift: '0px 8px 28px rgba(45,27,105,0.1)',
  /** A photo moment in the thread. */
  photo: '0px 6px 22px rgba(45,27,105,0.08)',
  /** The vessel itself. */
  vessel: '0px 12px 30px rgba(45,27,105,0.14)',
  /** Avatars and the toggle knob — small, tight, opaque. */
  avatar: '0px 2px 8px rgba(45,27,105,0.14)',
  knob: '0px 1px 3px rgba(45,27,105,0.25)',
  /** Sunk inputs. */
  input: '0px 3px 14px rgba(45,27,105,0.05)',
  inputActive: '0px 3px 14px rgba(242,100,122,0.14)',
  /** Warm gradient surfaces: the primary button and the reply orb. */
  warm: '0px 8px 20px rgba(242,100,122,0.3)',
} as const;
