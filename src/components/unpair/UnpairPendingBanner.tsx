import { View, Text } from 'react-native';
import { Button } from '@/components/ui/Button';
import { useUnpairFlow } from '@/hooks/useUnpairFlow';
import { useToast } from '@/components/ui/Toast';
import { useProfileStore } from '@/stores/profileStore';

export function UnpairPendingBanner() {
  const { confirmUnpair, declineUnpair, status, activeRequest } = useUnpairFlow();
  const partnerProfile = useProfileStore((s) => s.partnerProfile);
  const { showToast } = useToast();

  if (status !== 'partner_initiated' || !activeRequest) return null;

  const partnerName = partnerProfile?.display_name ?? 'Your partner';

  const handleConfirm = async () => {
    try {
      await confirmUnpair.mutateAsync();
    } catch {
      showToast('Something went wrong. Try again.', 'error');
    }
  };

  const handleDecline = async () => {
    try {
      await declineUnpair.mutateAsync();
      showToast('Request declined.', 'info');
    } catch {
      showToast('Something went wrong. Try again.', 'error');
    }
  };

  return (
    <View className="bg-imm-coral/10 border-2 border-imm-coral/30 rounded-2xl p-4 gap-3 mx-4">
      <Text className="font-nunito-bold text-imm-text text-sm">
        {partnerName} wants to end your connection
      </Text>
      <Text className="font-nunito text-imm-muted text-xs">
        You have 24 hours to respond. If you don't, the request will expire automatically.
      </Text>
      <View className="flex-row gap-2">
        <View className="flex-1">
          <Button
            onPress={handleConfirm}
            variant="danger"
            loading={confirmUnpair.isPending}
          >
            Confirm
          </Button>
        </View>
        <View className="flex-1">
          <Button
            onPress={handleDecline}
            variant="secondary"
            loading={declineUnpair.isPending}
          >
            Decline
          </Button>
        </View>
      </View>
    </View>
  );
}
