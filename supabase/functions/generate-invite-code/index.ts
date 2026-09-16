import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Short-lived by design: a code is shared in the moment, and an outstanding
// one is a standing offer to overwrite whoever you are paired with.
const INVITE_TTL_MS = 15 * 60 * 1000;

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

    // An already-paired user must not mint a code: redeeming it would
    // overwrite their existing partner_id and strand the current pair.
    const { data: ownProfile } = await supabase
      .from('profiles')
      .select('partner_id')
      .eq('id', user.id)
      .single();

    if (ownProfile?.partner_id) {
      return json({ error: 'You are already paired with someone' }, 409);
    }

    // Delete any existing pending invite from this user (one active invite at a time)
    await supabase
      .from('pairs')
      .delete()
      .eq('requester_id', user.id)
      .eq('status', 'pending');

    // Generate a 6-character alphanumeric code (uppercase)
    const code = Array.from(crypto.getRandomValues(new Uint8Array(6)))
      .map((b) => '0123456789ABCDEFGHJKMNPQRSTVWXYZ'[b % 32])
      .join('');

    // Create pair record — receiver_id filled in when code is redeemed
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS).toISOString();
    const { error: insertError } = await supabase
      .from('pairs')
      .insert({
        requester_id: user.id,
        receiver_id: null,
        invite_code: code,
        status: 'pending',
        expires_at: expiresAt,
      });

    if (insertError) {
      console.error('insert error', insertError);
      return json({ error: 'Could not generate code' }, 500);
    }

    return json({ code, expiresAt });
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
