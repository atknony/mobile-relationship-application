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

    const { localId, momentUrl } = await req.json() as {
      localId?: string;
      momentUrl?: string;
    };

    // Find the caller's active pair
    const { data: pair, error: pairError } = await supabase
      .from('pairs')
      .select('id')
      .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .eq('status', 'active')
      .single();

    if (pairError || !pair) {
      return json({ error: 'No active pair found' }, 404);
    }

    // Insert the moment (ping)
    const { error: insertError } = await supabase
      .from('moments')
      .insert({
        pair_id: pair.id,
        sender_id: user.id,
        photo_url: momentUrl ?? null,
      });

    if (insertError) {
      console.error('insert error', insertError);
      return json({ error: 'Could not send ping' }, 500);
    }

    // TODO: send push notification to partner via Expo Push API
    // (requires partner's push_token from profiles table)

    return json({ ok: true, localId });
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
