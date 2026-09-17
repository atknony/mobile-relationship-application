import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useProfileStore } from '@/stores/profileStore';

export function useInviteCode() {
  const queryClient = useQueryClient();
  const setPairedWith = useProfileStore((s) => s.setPairedWith);
  const setPairId = useProfileStore((s) => s.setPairId);

  const generateCode = useMutation({
    mutationFn: async (): Promise<string> => {
      const { data, error } = await supabase.functions.invoke<{ code: string }>(
        'generate-invite-code'
      );
      if (error) throw error;
      return data?.code ?? '';
    },
  });

  const redeemCode = useMutation({
    mutationFn: async (code: string): Promise<{ pairId: string; partnerId: string }> => {
      const { data, error } = await supabase.functions.invoke<{
        pairId: string;
        partnerId: string;
      }>('redeem-invite-code', { body: { code } });
      if (error) throw error;
      if (!data?.pairId || !data?.partnerId) throw new Error('Invalid response from server');
      return data;
    },
    onSuccess: ({ pairId, partnerId }) => {
      // pairedWith holds the partner's user_id; pairId is the pairs-table row.
      // These were swapped here, which put a pair UUID into a field every
      // other consumer reads as a user id.
      setPairedWith(partnerId);
      setPairId(pairId);
      void queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });

  return { generateCode, redeemCode };
}
