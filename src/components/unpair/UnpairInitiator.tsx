import { useState } from 'react';
import { View, Text, Modal, Pressable } from 'react-native';
import { Button } from '@/components/ui/Button';
import { useUnpairFlow } from '@/hooks/useUnpairFlow';
import { useToast } from '@/components/ui/Toast';

export function UnpairInitiator() {
  const [showConfirm, setShowConfirm] = useState(false);
  const { initiateUnpair, status } = useUnpairFlow();
  const { showToast } = useToast();

  const isPending = status === 'pending_partner';

  const handleInitiate = async () => {
    try {
      await initiateUnpair.mutateAsync();
      setShowConfirm(false);
      showToast('Unpair request sent. Waiting for your partner.', 'info');
    } catch {
      showToast('Something went wrong. Try again.', 'error');
    }
  };

  if (isPending) {
    return (
      <View className="bg-white/60 rounded-2xl p-4">
        <Text className="font-nunito-semibold text-imm-muted text-sm text-center">
          Waiting for your partner to confirm the unpair request...
        </Text>
      </View>
    );
  }

  return (
    <>
      <Button
        onPress={() => setShowConfirm(true)}
        variant="ghost"
        loading={initiateUnpair.isPending}
      >
        End this relationship
      </Button>

      <Modal visible={showConfirm} transparent animationType="fade">
        <Pressable
          onPress={() => setShowConfirm(false)}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center', padding: 24 }}
        >
          <Pressable>
            <View className="bg-white rounded-3xl p-6 gap-4">
              <Text className="font-nunito-bold text-imm-text text-lg text-center">
                End relationship?
              </Text>
              <Text className="font-nunito text-imm-muted text-sm text-center">
                Your partner will need to confirm. If they don't respond within 24 hours, the request will expire.
              </Text>
              <Button onPress={handleInitiate} variant="danger" loading={initiateUnpair.isPending}>
                Send request
              </Button>
              <Button onPress={() => setShowConfirm(false)} variant="ghost">
                Cancel
              </Button>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
