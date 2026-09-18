import { useState } from 'react';
import { View, Text, Modal, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { useUnpairFlow } from '@/hooks/useUnpairFlow';
import { useToast } from '@/components/ui/Toast';
import { useProfileStore } from '@/stores/profileStore';
import { colors } from '@/constants/colors';

export function UnpairInitiator() {
  const [showConfirm, setShowConfirm] = useState(false);
  const { dissolve } = useUnpairFlow();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const partnerName = useProfileStore((s) => s.partnerProfile?.username);

  const handleDissolve = async () => {
    try {
      await dissolve.mutateAsync();
      setShowConfirm(false);
    } catch {
      showToast(t('common.genericError'), 'error');
    }
  };

  return (
    <>
      {/* Quiet by design — the old "End this relationship" button was louder
          than the act deserves. The confirm sheet still does the guarding. */}
      <Pressable
        onPress={() => setShowConfirm(true)}
        disabled={dissolve.isPending}
        hitSlop={8}
        className="items-center"
        style={{ paddingVertical: 10 }}
      >
        <Text
          className="font-nunito"
          style={{ fontSize: 13, color: 'rgba(176,86,107,0.8)' }}
        >
          {partnerName ? t('unpair.disconnectFrom', { name: partnerName }) : t('unpair.disconnect')}
        </Text>
      </Pressable>

      <Modal visible={showConfirm} transparent animationType="fade">
        <Pressable
          onPress={() => setShowConfirm(false)}
          style={{
            flex: 1,
            backgroundColor: 'rgba(45,27,105,0.3)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 24,
          }}
        >
          <Pressable>
            <View
              className="bg-imm-surface"
              style={{ borderRadius: 26, padding: 24, gap: 14, width: 300 }}
            >
              <Text
                className="font-display text-imm-text text-center"
                style={{ fontSize: 22 }}
              >
                {partnerName ? t('unpair.confirmFrom', { name: partnerName }) : t('unpair.confirm')}
              </Text>
              <Text
                className="font-nunito text-imm-muted text-center"
                style={{ fontSize: 14 }}
              >
                {t('unpair.confirmBody')}
              </Text>
              <Button onPress={handleDissolve} loading={dissolve.isPending}>
                {t('unpair.disconnect')}
              </Button>
              <Pressable onPress={() => setShowConfirm(false)} className="items-center" style={{ paddingVertical: 8 }}>
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
