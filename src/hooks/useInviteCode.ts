import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useProfileStore } from '@/stores/profileStore';

/** An invite code and when it stops working (ISO timestamp). */
export interface Invite {
  code: string;
  expiresAt: string;
}

export function useInviteCode() {
  const queryClient = useQueryClient();
  const setPairedWith = useProfileStore((s) => s.setPairedWith);
  const setPairId = useProfileStore((s) => s.setPairId);

  // Also invalidates: the function deletes this person's previous pending
  // invite before inserting the new one, so an older code stops working.
  const generateCode = useMutation({
    mutationFn: async (): Promise<Invite> => {
      const { data, error } = await supabase.functions.invoke<Invite>('generate-invite-code');
      if (error) throw error;
      if (!data?.code || !data.expiresAt) throw new Error('Invalid response from server');
      return { code: data.code, expiresAt: data.expiresAt };
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
