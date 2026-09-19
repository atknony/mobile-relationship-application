import { useState } from 'react';
import { View, Text, Modal, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { deleteAccount } from '@/lib/deleteAccount';
import { colors } from '@/constants/colors';

/**
 * The account-deletion entry point (Play Store policy; GDPR / KVKK erasure).
 * As quiet as Disconnect, and guarded the same way — a confirm card that says
 * exactly what goes and that it cannot be undone.
 */
export function DeleteAccount() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleDelete = async () => {
    if (busy) return;
    setBusy(true);
    const message = await deleteAccount();
    if (message) {
      setBusy(false);
      showToast(message, 'error');
    }
    // On success the guard swaps to (auth) and this unmounts.
  };

  const close = () => {
    if (!busy) setConfirming(false);
  };

  return (
    <>
      <Pressable
        onPress={() => setConfirming(true)}
        hitSlop={8}
        accessibilityRole="button"
        className="items-center"
        style={{ paddingVertical: 10 }}
      >
        <Text className="font-nunito" style={{ fontSize: 13, color: 'rgba(176,86,107,0.8)' }}>
          {t('settings.deleteAccount')}
        </Text>
      </Pressable>

      <Modal visible={confirming} transparent animationType="fade" onRequestClose={close}>
        <Pressable
          onPress={close}
          style={{
            flex: 1,
            backgroundColor: 'rgba(45,27,105,0.3)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 24,
          }}
        >
          <Pressable>
            <View className="bg-imm-surface" style={{ borderRadius: 26, padding: 24, gap: 14, width: 300 }}>
              <Text className="font-display text-imm-text text-center" style={{ fontSize: 22 }}>
                {t('settings.deleteTitle')}
              </Text>
              <Text className="font-nunito text-imm-muted text-center" style={{ fontSize: 14 }}>
                {t('settings.deleteBody')}
              </Text>
              <Button onPress={handleDelete} loading={busy}>
                {t('settings.deleteConfirm')}
              </Button>
              <Pressable
                onPress={close}
                disabled={busy}
                className="items-center"
                style={{ paddingVertical: 8 }}
              >
                <Text className="font-nunito" style={{ fontSize: 14, color: colors.muted }}>
                  {t('common.cancel')}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
