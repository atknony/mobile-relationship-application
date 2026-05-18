import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useProfileStore } from '@/stores/profileStore';
import { useUnpairStore } from '@/stores/unpairStore';

export function useUnpairFlow() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const setPairedWith = useProfileStore((s) => s.setPairedWith);
  const setPartnerProfile = useProfileStore((s) => s.setPartnerProfile);
  const resetUnpair = useUnpairStore((s) => s.resetUnpair);
  const status = useUnpairStore((s) => s.status);
  const activeRequest = useUnpairStore((s) => s.activeRequest);

  const initiateUnpair = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke('initiate-unpair');
      if (error) throw error;
    },
  });

  const confirmUnpair = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke('confirm-unpair', {
        body: { requestId: activeRequest?.id },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setPairedWith(null);
      setPartnerProfile(null);
      resetUnpair();
      void queryClient.invalidateQueries({ queryKey: ['profile'] });
      router.replace('/(pair)/create-invite');
    },
  });

  const declineUnpair = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke('decline-unpair', {
        body: { requestId: activeRequest?.id },
      });
      if (error) throw error;
    },
    onSuccess: () => resetUnpair(),
  });

  return { initiateUnpair, confirmUnpair, declineUnpair, status, activeRequest };
}
