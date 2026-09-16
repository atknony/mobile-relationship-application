import type * as ExpoNotifications from 'expo-notifications';

/**
 * expo-notifications throws on import on Android inside Expo Go (SDK 53+ —
 * see warnOfExpoGoPushUsage.js, which does this deliberately). Loading it via
 * require() inside a try/catch keeps that from crashing the whole bundle;
 * real push notifications still need a development build either way.
 */
export const Notifications: typeof ExpoNotifications | null = (() => {
  try {
    // A static import cannot be caught — require() is the point of this shim.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-notifications');
  } catch {
    return null;
  }
})();
