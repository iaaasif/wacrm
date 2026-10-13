import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/automations/admin-client';
import { getBaileysQr } from '@/lib/whatsapp/baileys-client';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('account_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile?.account_id) {
    return NextResponse.json({ error: 'No account found' }, { status: 400 });
  }

  // Get current DB config
  const { data: config } = await supabase
    .from('whatsapp_config')
    .select('id, provider, baileys_status, baileys_phone, baileys_jid, status')
    .eq('account_id', profile.account_id)
    .maybeSingle();

  // Fetch live socket state from Baileys microservice
  const gatewayStatus = await getBaileysQr();

  // Auto-sync database if live socket is connected
  if (gatewayStatus.status === 'connected') {
    try {
      const db = supabaseAdmin();
      if (config) {
        if (
          config.baileys_status !== 'connected' ||
          config.provider !== 'baileys' ||
          config.status !== 'connected' ||
          (!config.baileys_phone && gatewayStatus.phone)
        ) {
          await db
            .from('whatsapp_config')
            .update({
              provider: 'baileys',
              baileys_status: 'connected',
              status: 'connected',
              baileys_phone: gatewayStatus.phone || config.baileys_phone || null,
              baileys_jid: gatewayStatus.jid || config.baileys_jid || null,
              baileys_connected_at: new Date().toISOString(),
            })
            .eq('id', config.id);
        }
      } else {
        await db.from('whatsapp_config').insert({
          user_id: user.id,
          account_id: profile.account_id,
          provider: 'baileys',
          baileys_status: 'connected',
          status: 'connected',
          baileys_phone: gatewayStatus.phone || null,
          baileys_jid: gatewayStatus.jid || null,
          baileys_connected_at: new Date().toISOString(),
        });
      }
    } catch (syncErr) {
      console.error('[baileys/status] Error auto-syncing config:', syncErr);
    }
  } else {
    // Socket is disconnected or waiting for QR scan — sync database if it currently shows connected
    if (config && (config.baileys_status === 'connected' || config.status === 'connected')) {
      try {
        const db = supabaseAdmin();
        await db
          .from('whatsapp_config')
          .update({
            baileys_status: gatewayStatus.status,
            status: 'disconnected',
            baileys_phone: null,
            baileys_jid: null,
            baileys_connected_at: null,
          })
          .eq('id', config.id);
      } catch (syncErr) {
        console.error('[baileys/status] Error auto-syncing disconnected state:', syncErr);
      }
    }
  }

  return NextResponse.json({
    provider: config?.provider || 'baileys',
    status: gatewayStatus.status,
    qrCodeUrl: gatewayStatus.qrCodeUrl,
    phone: gatewayStatus.phone || config?.baileys_phone || null,
    jid: gatewayStatus.jid || config?.baileys_jid || null,
  });
}
