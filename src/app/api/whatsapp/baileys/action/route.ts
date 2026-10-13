import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  restartBaileysSession,
  logoutBaileysSession,
  requestBaileysPairingCode,
} from '@/lib/whatsapp/baileys-client';

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('account_id, role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile?.account_id) {
    return NextResponse.json({ error: 'No account found' }, { status: 400 });
  }

  let body: { action?: string; provider?: string; phone?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const { action, provider, phone } = body;

  // 1. Switch active provider
  if (action === 'set_provider') {
    if (!provider || !['meta', 'baileys'].includes(provider)) {
      return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from('whatsapp_config')
      .select('id')
      .eq('account_id', profile.account_id)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('whatsapp_config')
        .update({ provider, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      await supabase.from('whatsapp_config').insert({
        user_id: user.id,
        account_id: profile.account_id,
        provider,
        status: 'disconnected',
      });
    }

    return NextResponse.json({ success: true, provider });
  }

  // 2. Restart connection
  if (action === 'restart') {
    try {
      await restartBaileysSession();
      return NextResponse.json({ success: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to restart session';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  // 3. Logout session
  if (action === 'logout') {
    try {
      await logoutBaileysSession();
      await supabase
        .from('whatsapp_config')
        .update({
          baileys_status: 'disconnected',
          status: 'disconnected',
          baileys_phone: null,
          baileys_jid: null,
          baileys_connected_at: null,
        })
        .eq('account_id', profile.account_id);
      return NextResponse.json({ success: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to logout';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  // 4. Request pairing code
  if (action === 'pair') {
    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }
    try {
      const code = await requestBaileysPairingCode(phone);
      return NextResponse.json({ code });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate code';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
