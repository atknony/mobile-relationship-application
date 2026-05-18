import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useProfileStore } from '@/stores/profileStore';

// Simplified unpair: directly dissolves the pair via the dissolve-pair Edge Function.
// (A mutual-consent flow can be added later with an unpair_requests table.)
export function useUnpairFlow() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const setPairedWith = useProfileStore((s) => s.setPairedWith);
  const setPartnerProfile = useProfileStore((s) => s.setPartnerProfile);
  const setPairId = useProfileStore((s) => s.setPairId);

  const dissolve = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke('dissolve-pair');
      if (error) throw error;
    },
    onSuccess: () => {
      setPairedWith(null);
      setPartnerProfile(null);
      setPairId(null);
      void queryClient.invalidateQueries({ queryKey: ['profile'] });
      router.replace('/(pair)/create-invite');
    },
  });

  return { dissolve };
}
