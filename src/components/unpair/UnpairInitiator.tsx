import { useState } from 'react';
import { View, Text, Modal, Pressable } from 'react-native';
import { Button } from '@/components/ui/Button';
import { useUnpairFlow } from '@/hooks/useUnpairFlow';
import { useToast } from '@/components/ui/Toast';

export function UnpairInitiator() {
  const [showConfirm, setShowConfirm] = useState(false);
  const { dissolve } = useUnpairFlow();
  const { showToast } = useToast();

  const handleDissolve = async () => {
    try {
      await dissolve.mutateAsync();
      setShowConfirm(false);
    } catch {
      showToast('Something went wrong. Try again.', 'error');
    }
  };

  return (
    <>
      <Button
        onPress={() => setShowConfirm(true)}
        variant="ghost"
        loading={dissolve.isPending}
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
                This will disconnect you from your partner immediately.
              </Text>
              <Button onPress={handleDissolve} variant="danger" loading={dissolve.isPending}>
                Disconnect
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
