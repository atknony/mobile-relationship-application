import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { i18n } from '@/lib/i18n';
import { useAuthStore } from '@/stores/authStore';
import { useInviteCode, type Invite } from '@/hooks/useInviteCode';
import { useToast } from '@/components/ui/Toast';

/**
 * The code the invite screen shows, ready as soon as the screen is.
 *
 * On open it reuses this person's live pending invite if there is one, and only
 * otherwise generates a new code. Generating on every open would quietly kill a
 * code they had already sent: reopening the app while waiting for the other
 * person to type it must not invalidate it.
 *
 * `refresh()` always generates — the Edge Function deletes the previous pending
 * invite first, so the old code stops working at once.
 */
export function usePairingCode() {
  const userId = useAuthStore((s) => s.user?.id);
  const { generateCode } = useInviteCode();
  const { showToast } = useToast();
  const [invite, setInvite] = useState<Invite | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  const { mutateAsync } = generateCode;
  const generate = useCallback(async () => {
    try {
      const next = await mutateAsync();
      if (mounted.current) setInvite(next);
    } catch {
      showToast(i18n.t('pair.generateFailed'), 'error');
    }
  }, [mutateAsync, showToast]);
  // The load below runs once per account, not whenever `generate` is rebuilt.
  const generateRef = useRef(generate);
  useEffect(() => {
    generateRef.current = generate;
  }, [generate]);

  useEffect(() => {
    mounted.current = true;
    if (!userId) return;
    void (async () => {
      const { data } = await supabase
        .from('pairs')
        .select('invite_code, expires_at')
        .eq('requester_id', userId)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!mounted.current) return;
      if (data?.invite_code && data.expires_at) {
        setInvite({ code: data.invite_code, expiresAt: data.expires_at });
      } else {
        await generateRef.current();
      }
      if (mounted.current) setLoading(false);
    })();
    return () => {
      mounted.current = false;
    };
  }, [userId]);

  const refresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    await generate();
    if (mounted.current) setRefreshing(false);
  }, [generate, refreshing]);

  return { invite, loading, refreshing, refresh };
}
