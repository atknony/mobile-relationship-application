import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

// A ping is a "thinking of you right now" signal. Delivering one hours later
// is noise, so let it expire rather than queue indefinitely at the FCM/APNs layer.
const PUSH_TTL_SECONDS = 900;

interface PushTicket {
  status?: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

async function sendExpoPush(params: {
  token: string;
  title: string;
  body?: string;
  data: Record<string, unknown>;
}): Promise<PushTicket | null> {
  const accessToken = Deno.env.get('EXPO_ACCESS_TOKEN');
  const res = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      // Only needed when "Enhanced Security for Push Notifications" is on.
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({
      to: params.token,
      title: params.title,
      body: params.body,
      data: params.data,
      sound: 'default',
      priority: 'high',
      channelId: 'default',
      ttl: PUSH_TTL_SECONDS,
    }),
  });

  if (!res.ok) {
    console.error('expo push http error', res.status, await res.text());
    return null;
  }
  const payload = await res.json();
  return (payload?.data ?? null) as PushTicket | null;
}

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
      .select('id, requester_id, receiver_id')
      .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .eq('status', 'active')
      .single();

    if (pairError || !pair) {
      return json({ error: 'No active pair found' }, 404);
    }

    // Insert the moment (ping)
    const { data: moment, error: insertError } = await supabase
      .from('moments')
      .insert({
        pair_id: pair.id,
        sender_id: user.id,
        photo_url: momentUrl ?? null,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('insert error', insertError);
      return json({ error: 'Could not send ping' }, 500);
    }

    // Push is best-effort: the moment row is already written and Realtime will
    // still deliver it in-app, so a push failure must not fail the request.
    const partnerId =
      pair.requester_id === user.id ? pair.receiver_id : pair.requester_id;

    try {
      const { data: people } = await supabase
        .from('profiles')
        .select('id, username, push_token')
        .in('id', [user.id, partnerId]);

      const partner = people?.find((p) => p.id === partnerId);
      const sender = people?.find((p) => p.id === user.id);

      if (partner?.push_token) {
        const ticket = await sendExpoPush({
          token: partner.push_token,
          title: `${sender?.username ?? 'Your partner'} is thinking of you 💙`,
          body: momentUrl ? 'Sent you a moment' : undefined,
          data: { type: 'ping', momentId: moment.id, senderId: user.id },
        });

        // The token is dead (app uninstalled / reinstalled) — stop using it.
        if (ticket?.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
          await supabase
            .from('profiles')
            .update({ push_token: null })
            .eq('id', partnerId);
        } else if (ticket?.status === 'error') {
          console.error('expo push ticket error', ticket.message, ticket.details);
        }
      }
    } catch (pushErr) {
      console.error('push delivery failed', pushErr);
    }

    return json({ ok: true, localId, momentId: moment.id });
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
