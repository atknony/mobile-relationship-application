import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

    const { code } = await req.json() as { code: string };
    if (!code || typeof code !== 'string') {
      return json({ error: 'Missing code' }, 400);
    }

    const normalized = code.toUpperCase().trim();

    // Check the redeemer doesn't already have an active partner
    const { data: ownProfile } = await supabase
      .from('profiles')
      .select('partner_id')
      .eq('id', user.id)
      .single();

    if (ownProfile?.partner_id) {
      return json({ error: 'You are already paired with someone' }, 409);
    }

    // Claim the invite in a single statement. Every precondition lives in the
    // filter, so two people redeeming the same code concurrently cannot both
    // succeed: the second matches zero rows. Selecting then updating (as this
    // did before) left a window where both callers passed the checks and the
    // second silently overwrote receiver_id.
    const { data: pair, error: claimError } = await supabase
      .from('pairs')
      .update({ receiver_id: user.id, status: 'active', invite_code: null })
      .eq('invite_code', normalized)
      .eq('status', 'pending')
      .neq('requester_id', user.id)
      .gt('expires_at', new Date().toISOString())
      .select('id, requester_id')
      .maybeSingle();

    if (claimError) {
      console.error('claim error', claimError);
      return json({ error: 'Could not complete pairing' }, 500);
    }

    if (!pair) {
      // Nothing was claimed. Read once more purely to explain why.
      const { data: existing } = await supabase
        .from('pairs')
        .select('requester_id')
        .eq('invite_code', normalized)
        .maybeSingle();

      if (existing?.requester_id === user.id) {
        return json({ error: 'Cannot redeem your own invite code' }, 400);
      }
      return json({ error: 'Invalid or expired code' }, 404);
    }

    // The requester may have paired with someone else since generating this
    // code. Claiming it anyway would overwrite their partner_id and break a
    // live relationship, so give the claim back.
    const { data: requesterProfile } = await supabase
      .from('profiles')
      .select('partner_id')
      .eq('id', pair.requester_id)
      .single();

    if (requesterProfile?.partner_id) {
      await supabase
        .from('pairs')
        .update({ status: 'dissolved', receiver_id: null })
        .eq('id', pair.id);
      return json({ error: 'That code is no longer valid' }, 409);
    }

    // Set partner_id on both profiles
    const [res1, res2] = await Promise.all([
      supabase
        .from('profiles')
        .update({ partner_id: user.id })
        .eq('id', pair.requester_id),
      supabase
        .from('profiles')
        .update({ partner_id: pair.requester_id })
        .eq('id', user.id),
    ]);

    if (res1.error || res2.error) {
      console.error('profile update errors', res1.error, res2.error);
      return json({ error: 'Pairing completed but profile sync failed' }, 500);
    }

    // Both users are now paired, so any other invite either of them left
    // outstanding must die — otherwise a third party could redeem it later and
    // overwrite this pairing.
    await supabase
      .from('pairs')
      .delete()
      .eq('status', 'pending')
      .in('requester_id', [user.id, pair.requester_id]);

    // partnerId, not pairId: the client stores this as profileStore.pairedWith,
    // which is contracted to hold the partner's user_id.
    return json({ pairId: pair.id, partnerId: pair.requester_id });
  } catch (err) {
    console.error(err);
    return json({ error: 'Internal server error' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
