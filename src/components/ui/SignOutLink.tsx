import { useState } from 'react';
import { Pressable, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { signOut } from '@/lib/signOut';
import { useToast } from '@/components/ui/Toast';
import { colors } from '@/constants/colors';

/**
 * The quiet way out, used anywhere a route group would otherwise be a dead end.
 *
 * It signs out rather than navigating back. A plain "back to the phone screen"
 * cannot work: the guard sends anyone with a session and a profile straight to
 * (pair) or (home), so a push to (auth) would be replaced on the next render —
 * a visible flicker at best, a loop at worst. Dropping the session is the only
 * honest way to reach that screen again.
 */
export function SignOutLink({ label }: { label?: string }) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const { showToast } = useToast();

  const handlePress = async () => {
    if (busy) return;
    setBusy(true);

    const message = await signOut();
    if (message) {
      // Only reached if even the local sign-out failed, so this screen is still
      // mounted and the button has to come back.
      setBusy(false);
      showToast(message, 'error');
    }
    // On success the guard swaps route groups and this unmounts — no state to
    // put back.
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={busy}
      hitSlop={8}
      className="items-center"
      style={{ paddingVertical: 10, opacity: busy ? 0.5 : 1 }}
    >
      <Text className="font-nunito" style={{ fontSize: 14, color: colors.muted }}>
        {label ?? t('common.signOut')}
      </Text>
    </Pressable>
  );
}
