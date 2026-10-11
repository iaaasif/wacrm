import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
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
    .select('provider, baileys_status, baileys_phone, baileys_jid')
    .eq('account_id', profile.account_id)
    .maybeSingle();

  // Fetch live socket state from Baileys microservice
  const gatewayStatus = await getBaileysQr();

  return NextResponse.json({
    provider: config?.provider || 'meta',
    status: gatewayStatus.status,
    qrCodeUrl: gatewayStatus.qrCodeUrl,
    phone: gatewayStatus.phone || config?.baileys_phone || null,
    jid: gatewayStatus.jid || config?.baileys_jid || null,
  });
}
