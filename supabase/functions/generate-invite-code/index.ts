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
    const { error: insertError } = await supabase
      .from('pairs')
      .insert({
        requester_id: user.id,
        receiver_id: null,
        invite_code: code,
        status: 'pending',
      });

    if (insertError) {
      console.error('insert error', insertError);
      return json({ error: 'Could not generate code' }, 500);
    }

    return json({ code });
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
