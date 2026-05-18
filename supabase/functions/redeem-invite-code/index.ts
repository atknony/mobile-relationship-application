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

    // Find the pending pair with this invite code
    const { data: pair, error: findError } = await supabase
      .from('pairs')
      .select('*')
      .eq('invite_code', code.toUpperCase().trim())
      .eq('status', 'pending')
      .single();

    if (findError || !pair) {
      return json({ error: 'Invalid or expired code' }, 404);
    }

    // Can't pair with yourself
    if (pair.requester_id === user.id) {
      return json({ error: 'Cannot redeem your own invite code' }, 400);
    }

    // Check the redeemer doesn't already have an active partner
    const { data: ownProfile } = await supabase
      .from('profiles')
      .select('partner_id')
      .eq('id', user.id)
      .single();

    if (ownProfile?.partner_id) {
      return json({ error: 'You are already paired with someone' }, 409);
    }

    // Activate the pair: set receiver and status
    const { error: pairUpdateError } = await supabase
      .from('pairs')
      .update({ receiver_id: user.id, status: 'active', invite_code: null })
      .eq('id', pair.id);

    if (pairUpdateError) {
      console.error('pair update error', pairUpdateError);
      return json({ error: 'Could not complete pairing' }, 500);
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

    return json({ pairId: pair.id });
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
