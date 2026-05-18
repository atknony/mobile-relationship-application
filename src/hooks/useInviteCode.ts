import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useProfileStore } from '@/stores/profileStore';

export function useInviteCode() {
  const queryClient = useQueryClient();
  const setPairedWith = useProfileStore((s) => s.setPairedWith);

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
    mutationFn: async (code: string): Promise<{ pairId: string }> => {
      const { data, error } = await supabase.functions.invoke<{ pairId: string }>(
        'redeem-invite-code',
        { body: { code } }
      );
      if (error) throw error;
      if (!data?.pairId) throw new Error('Invalid response from server');
      return data;
    },
    onSuccess: ({ pairId }) => {
      setPairedWith(pairId);
      void queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });

  return { generateCode, redeemCode };
}
