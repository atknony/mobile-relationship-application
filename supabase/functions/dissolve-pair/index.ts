import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Authenticate caller
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Unauthorized' }, 401);
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) {
      return json({ error: 'Unauthorized' }, 401);
    }

    // Find the caller's active pair
    const { data: pair, error: pairError } = await supabase
      .from('pairs')
      .select('id, requester_id, receiver_id')
      .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .eq('status', 'active')
      .single();

    if (pairError || !pair) {
      return json({ error: 'No active pair found' }, 404);
    }

    const partnerId =
      pair.requester_id === user.id ? pair.receiver_id : pair.requester_id;

    // Mark pair as dissolved
    const { error: dissolveError } = await supabase
      .from('pairs')
      .update({ status: 'dissolved' })
      .eq('id', pair.id);

    if (dissolveError) {
      console.error('dissolve error', dissolveError);
      return json({ error: 'Could not dissolve pair' }, 500);
    }

    // Clear partner_id on both profiles
    const [res1, res2] = await Promise.all([
      supabase.from('profiles').update({ partner_id: null }).eq('id', user.id),
      supabase.from('profiles').update({ partner_id: null }).eq('id', partnerId),
    ]);

    if (res1.error || res2.error) {
      console.error('profile cleanup errors', res1.error, res2.error);
      // Pair is dissolved; profile cleanup failure is non-fatal — client will redirect anyway
    }

    // Retention: a dissolved pair's history is never shown again (moments are
    // readable only within an active pair), so its photos and rows go now
    // rather than sitting in storage for good. Best effort — the daily
    // retention-sweep deletes the pair row and anything left unreferenced.
    try {
      await deletePairHistory(supabase, pair.id);
    } catch (err) {
      console.error('history cleanup failed', err);
    }

    return json({ ok: true });
  } catch (err) {
    console.error(err);
    return json({ error: 'Internal server error' }, 500);
  }
});

async function deletePairHistory(supabase: SupabaseClient, pairId: string) {
  const { data: rows, error } = await supabase
    .from('moments')
    .select('photo_path')
    .eq('pair_id', pairId)
    .not('photo_path', 'is', null);
  if (error) throw error;

  const paths = (rows ?? []).map((r) => r.photo_path as string);
  for (let i = 0; i < paths.length; i += 100) {
    const { error: removeError } = await supabase.storage
      .from('moments')
      .remove(paths.slice(i, i + 100));
    if (removeError) throw removeError;
  }

  const { error: deleteError } = await supabase.from('moments').delete().eq('pair_id', pairId);
  if (deleteError) throw deleteError;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
