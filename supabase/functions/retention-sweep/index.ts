import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// The daily retention job (GDPR Art. 5(1)(e) / KVKK Art. 4 — kept no longer
// than needed). Triggered by pg_cron through pg_net (20260919110000); nothing
// in the app calls it.
//
// Deployed with verify_jwt off: the caller is the database, not a user. It
// proves itself with `x-retention-secret`, a random value kept in Vault that
// only this function (through retention_secret_matches, service_role only) and
// the cron job can read — no secret has to be copied into the function's env.
//
// Each run:
// 1. rows  — expired invites and ended pairs (cascading to their moments);
// 2. files — storage objects nothing references any more: photos of deleted
//            moments, replaced avatars, and everything of deleted accounts;
// 3. users — sign-ups that never created a profile within 30 days.

const REMOVE_BATCH = 100;
const MAX_ROUNDS = 20; // a run removes at most 20 × 1000 objects; the rest wait a day

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const secret = req.headers.get('x-retention-secret') ?? '';
    const { data: allowed } = await supabase.rpc('retention_secret_matches', { secret });
    if (!secret || allowed !== true) return json({ error: 'Unauthorized' }, 401);

    const { data: rows, error: rowsError } = await supabase.rpc('retention_sweep_rows');
    if (rowsError) throw rowsError;

    const removedObjects = await removeOrphans(supabase);

    const { data: stale, error: staleError } = await supabase.rpc('retention_stale_signups', {
      max_rows: 100,
    });
    if (staleError) throw staleError;
    let deletedUsers = 0;
    for (const id of (stale ?? []) as string[]) {
      const { error } = await supabase.auth.admin.deleteUser(id);
      if (error) console.error('stale sign-up delete failed', id, error);
      else deletedUsers++;
    }

    const summary = { rows, removedObjects, deletedUsers };
    console.log('retention sweep', JSON.stringify(summary));
    return json(summary);
  } catch (err) {
    console.error(err);
    return json({ error: 'Internal server error' }, 500);
  }
});

async function removeOrphans(supabase: SupabaseClient): Promise<number> {
  let removed = 0;
  for (let round = 0; round < MAX_ROUNDS; round++) {
    const { data, error } = await supabase.rpc('retention_orphan_objects', { max_rows: 1000 });
    if (error) throw error;
    const objects = (data ?? []) as { bucket_id: string; name: string }[];
    if (objects.length === 0) break;

    const byBucket = new Map<string, string[]>();
    for (const o of objects) byBucket.set(o.bucket_id, [...(byBucket.get(o.bucket_id) ?? []), o.name]);

    let progressed = false;
    for (const [bucket, names] of byBucket) {
      for (let i = 0; i < names.length; i += REMOVE_BATCH) {
        const { data: gone, error: removeError } = await supabase.storage
          .from(bucket)
          .remove(names.slice(i, i + REMOVE_BATCH));
        if (removeError) {
          console.error('remove failed', bucket, removeError);
          continue;
        }
        removed += gone?.length ?? 0;
        if (gone?.length) progressed = true;
      }
    }
    // Stop rather than spin if storage refuses everything this round.
    if (!progressed) break;
  }
  return removed;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
