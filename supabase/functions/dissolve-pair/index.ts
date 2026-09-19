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

    // Tell the other phone now, whether it is open or not: Realtime only
    // reaches an open app.
    try {
      await notifyPartnerLeft(supabase, user.id, partnerId);
    } catch (err) {
      console.error('partner-left push failed', err);
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

// ---------------------------------------------------------------------------
// "Your partner disconnected" — the push the other phone gets. Mirrors
// unpair.pushTitle / unpair.pushBody in the app's src/locales; dissolve-pair
// and delete-account each keep this copy (keep all three in step). Written in
// the *recipient's* language (profiles.locale), falling back to English.
// Best effort: the pair is already ended, and the app also re-checks the pair
// whenever it comes to the foreground.
// ---------------------------------------------------------------------------
const PARTNER_LEFT_STRINGS = {
  en: {
    title: 'Your connection has ended',
    body: (name: string) => `${name} disconnected. Open Imm to pair again.`,
    someone: 'Your partner',
  },
  tr: {
    title: 'Bağlantın sona erdi',
    body: (name: string) => `${name} bağlantıyı kesti. Yeniden eşleşmek için uygulamayı aç.`,
    someone: 'Partnerin',
  },
  es: {
    title: 'Tu conexión terminó',
    body: (name: string) => `${name} se desconectó. Abre Imm para vincularte de nuevo.`,
    someone: 'Tu pareja',
  },
  zh: {
    title: '你们的连接已结束',
    body: (name: string) => `${name} 已断开连接。打开 Imm 即可重新配对。`,
    someone: '你的另一半',
  },
  ja: {
    title: 'つながりが解除されたよ',
    body: (name: string) => `${name} がつながりを解除したよ。Imm を開けば、またペアリングできるよ。`,
    someone: 'パートナー',
  },
} as const;

async function notifyPartnerLeft(supabase: SupabaseClient, leaverId: string, partnerId: string) {
  const { data: people } = await supabase
    .from('profiles')
    .select('id, username, push_token, locale')
    .in('id', [leaverId, partnerId]);
  const partner = people?.find((p) => p.id === partnerId);
  const leaver = people?.find((p) => p.id === leaverId);
  if (!partner?.push_token) return;

  const locale = partner.locale as string | null;
  const strings =
    locale && Object.hasOwn(PARTNER_LEFT_STRINGS, locale)
      ? PARTNER_LEFT_STRINGS[locale as keyof typeof PARTNER_LEFT_STRINGS]
      : PARTNER_LEFT_STRINGS.en;

  const accessToken = Deno.env.get('EXPO_ACCESS_TOKEN');
  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({
      to: partner.push_token,
      title: strings.title,
      body: strings.body(leaver?.username ?? strings.someone),
      data: { type: 'unpaired' },
      sound: 'default',
      priority: 'high',
      channelId: 'default',
    }),
  });
  if (!res.ok) {
    console.error('partner-left push http error', res.status, await res.text());
    return;
  }
  const ticket = (await res.json())?.data;
  if (ticket?.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
    await supabase.from('profiles').update({ push_token: null }).eq('id', partnerId);
  } else if (ticket?.status === 'error') {
    console.error('partner-left push ticket error', ticket.message, ticket.details);
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
