import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Deletes the caller's account and everything that is theirs (Play Store
// account-deletion policy; GDPR Art. 17 / KVKK Art. 7):
//
// 1. An active pair is dissolved first, as an UPDATE, so the partner's app
//    hears it over Realtime (usePairRealtime watches UPDATEs on the pair row)
//    and leaves Home at once rather than on its next launch.
// 2. Every object in the caller's folders of `moments` and `avatars`.
// 3. The auth user. The foreign keys cascade from there: profile → pairs →
//    moments, and active_devices; auth.sessions goes with the user, so every
//    token this account held stops working.
//
// Photos the *partner* sent in a pair with this person lose their moment rows
// in that cascade and become unreferenced; the daily retention-sweep removes
// them. A storage failure never blocks the deletion itself — the sweep also
// collects anything in the folder of a user who no longer exists.

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, 401);
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) return json({ error: 'Unauthorized' }, 401);

    const { data: pair } = await supabase
      .from('pairs')
      .select('id, requester_id, receiver_id')
      .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .eq('status', 'active')
      .maybeSingle();

    if (pair) {
      const partnerId = pair.requester_id === user.id ? pair.receiver_id : pair.requester_id;
      await supabase.from('pairs').update({ status: 'dissolved' }).eq('id', pair.id);
      if (partnerId) {
        await supabase.from('profiles').update({ partner_id: null }).eq('id', partnerId);
      }
    }

    for (const bucket of ['moments', 'avatars']) {
      try {
        await removeFolder(supabase, bucket, user.id);
      } catch (err) {
        console.error('storage cleanup failed', bucket, err);
      }
    }

    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.error('delete user failed', deleteError);
      return json({ error: 'Could not delete account' }, 500);
    }

    return json({ ok: true });
  } catch (err) {
    console.error(err);
    return json({ error: 'Internal server error' }, 500);
  }
});

/** Removes every object under `<folder>/` in a bucket, a page at a time. */
async function removeFolder(supabase: SupabaseClient, bucket: string, folder: string) {
  // Each round deletes what it listed, so the next list starts over at offset 0.
  for (let round = 0; round < 100; round++) {
    const { data, error } = await supabase.storage.from(bucket).list(folder, { limit: 100 });
    if (error) throw error;
    const paths = (data ?? []).filter((o) => o.id).map((o) => `${folder}/${o.name}`);
    if (paths.length === 0) return;
    const { error: removeError } = await supabase.storage.from(bucket).remove(paths);
    if (removeError) throw removeError;
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
