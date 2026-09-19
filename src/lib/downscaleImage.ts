import type * as ImageManipulatorModule from 'expo-image-manipulator';

/**
 * Longest edge a photo is uploaded at. Pings are viewed on a phone, at most
 * full-screen; a 4000px camera original is ~4x the pixels and bytes for
 * nothing. 1600 keeps a crisp full-screen view on a high-density display.
 */
const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.8;

type Manipulator = typeof ImageManipulatorModule;
let manipulator: Manipulator | null | undefined;

/**
 * Loaded on first use rather than imported: expo-image-manipulator is a native
 * module, and a development build made before it was added has no native half —
 * a top-level import would throw at startup and take the whole app down. Such
 * a build simply uploads photos at full size until it is rebuilt.
 */
function loadManipulator(): Manipulator | null {
  if (manipulator !== undefined) return manipulator;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    manipulator = require('expo-image-manipulator') as Manipulator;
  } catch {
    manipulator = null;
  }
  return manipulator;
}

/**
 * A JPEG no larger than MAX_EDGE on its longest side, as a local file URI.
 * Never throws: anything that goes wrong returns the original, because a photo
 * uploaded large is a cost, while a photo that cannot be sent is a failure.
 */
export async function downscaleJpeg(uri: string): Promise<string> {
  const lib = loadManipulator();
  if (!lib) return uri;
  try {
    const original = await lib.ImageManipulator.manipulate(uri).renderAsync();
    const longest = Math.max(original.width, original.height);
    const context = lib.ImageManipulator.manipulate(original);
    if (longest > MAX_EDGE) {
      context.resize(original.width >= original.height ? { width: MAX_EDGE } : { height: MAX_EDGE });
    }
    const rendered = await context.renderAsync();
    const saved = await rendered.saveAsync({ compress: JPEG_QUALITY, format: lib.SaveFormat.JPEG });
    return saved.uri;
  } catch {
    return uri;
  }
}
