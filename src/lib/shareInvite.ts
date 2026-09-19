import { Share } from 'react-native';
import { i18n } from '@/lib/i18n';

/**
 * Opens the system share sheet (WhatsApp, SMS, …) with the invite code in a
 * message the other person can act on — plain text, no link: they type the code.
 *
 * Resolves true when the sheet reports a share. Android always reports one
 * (it cannot tell a share from a dismissal), so treat it as "probably sent".
 */
export async function shareInviteCode(code: string): Promise<boolean> {
  try {
    const result = await Share.share({ message: i18n.t('pair.shareMessage', { code }) });
    return result.action === Share.sharedAction;
  } catch {
    return false;
  }
}
