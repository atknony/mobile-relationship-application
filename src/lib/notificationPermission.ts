import { Linking } from 'react-native';
import { isExpoGo, Notifications } from '@/lib/notifications';
import { useAppStore, type NotificationPermission } from '@/stores/appStore';

type PermissionAnswer = { granted: boolean; status: string; canAskAgain: boolean };

export function publishPermission(answer: PermissionAnswer) {
  const next: NotificationPermission = {
    granted: answer.granted,
    status: answer.status,
    canAskAgain: answer.canAskAgain,
  };
  const current = useAppStore.getState().notificationPermission;
  if (
    current?.granted === next.granted &&
    current.status === next.status &&
    current.canAskAgain === next.canAskAgain
  ) {
    return;
  }
  useAppStore.getState().setNotificationPermission(next);
}

/** Re-reads the OS permission into appStore. Never prompts. */
export async function readNotificationPermission(): Promise<void> {
  if (!Notifications || isExpoGo) return;
  try {
    publishPermission(await Notifications.getPermissionsAsync());
  } catch {
    // Leave the last known answer.
  }
}

/**
 * The Settings row's action when notifications are off: this app's page in the
 * device settings. The foreground re-read (useNotificationPermission) picks up
 * the change when the person comes back, and the row turns to "On".
 */
export async function openNotificationSettings(): Promise<void> {
  await Linking.openSettings();
}
