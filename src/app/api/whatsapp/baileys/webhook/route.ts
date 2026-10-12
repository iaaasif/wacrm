import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/automations/admin-client';
import { resolveConversationByPhone } from '@/lib/whatsapp/resolve-conversation';
import { runAutomationsForTrigger, resumeAwaitingReply } from '@/lib/automations/engine';
import { dispatchInboundToAiReply } from '@/lib/ai/auto-reply';
import { dispatchInboundToFlows } from '@/lib/flows/engine';
import { dispatchWebhookEvent } from '@/lib/webhooks/deliver';

export async function POST(req: Request) {
  const secretHeader = req.headers.get('x-baileys-secret');
  const expectedSecret = process.env.BAILEYS_GATEWAY_SECRET;

  if (expectedSecret && secretHeader !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized secret' }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { event, data } = body;
  const db = supabaseAdmin();

  // 1. Connection update
  if (event === 'connection_update') {
    const { status, phone, jid } = data || {};
    // Find the config with provider = 'baileys' or fallback to the single config
    let { data: configs } = await db
      .from('whatsapp_config')
      .select('id, account_id')
      .eq('provider', 'baileys')
      .limit(1);

    if (!configs || configs.length === 0) {
      const { data: fallbackConfigs } = await db
        .from('whatsapp_config')
        .select('id, account_id')
        .limit(1);
      configs = fallbackConfigs;
    }

    const configId = configs?.[0]?.id;
    if (configId) {
      await db
        .from('whatsapp_config')
        .update({
          provider: 'baileys',
          baileys_status: status,
          baileys_phone: phone ?? null,
          baileys_jid: jid ?? null,
          baileys_connected_at: status === 'connected' ? new Date().toISOString() : null,
          status: status === 'connected' ? 'connected' : 'disconnected',
        })
        .eq('id', configId);
    }
    return NextResponse.json({ ok: true });
  }

  // 2. Inbound message
  if (event === 'inbound_message') {
    const msg = data?.message;
    if (!msg) {
      return NextResponse.json({ ok: true });
    }

    const { id: messageId, fromMe, senderPhone, type, text, timestamp } = msg;

    // Find the active account for Baileys
    let { data: configs } = await db
      .from('whatsapp_config')
      .select('id, account_id, user_id')
      .eq('provider', 'baileys')
      .limit(1);

    if (!configs || configs.length === 0) {
      const { data: fallbackConfigs } = await db
        .from('whatsapp_config')
        .select('id, account_id, user_id')
        .limit(1);
      configs = fallbackConfigs;
    }

    if (!configs || configs.length === 0) {
      return NextResponse.json({ ok: true, notice: 'No Baileys account configured' });
    }

    const accountId = configs[0].account_id;

    if (!senderPhone) {
      return NextResponse.json({ ok: true });
    }

    // Format phone with leading '+'
    const cleanPhone = senderPhone.startsWith('+') ? senderPhone : `+${senderPhone}`;

    try {
      const resolved = await resolveConversationByPhone(db, accountId, cleanPhone);
      const conversationId = resolved.conversationId;
      const contactId = resolved.contactId;

      // Check if message already exists (deduplication)
      const { data: existingMsg } = await db
        .from('messages')
        .select('id')
        .eq('message_id', messageId)
        .maybeSingle();

      if (existingMsg) {
        return NextResponse.json({ ok: true, notice: 'Already processed' });
      }

      const contentType = ['image', 'video', 'audio', 'document'].includes(type) ? type : 'text';

      // Insert message
      const { data: insertedMsg, error: insertError } = await db
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_type: fromMe ? 'agent' : 'customer',
          content_type: contentType,
          content_text: text || '',
          message_id: messageId,
          status: 'delivered',
          created_at: timestamp ? new Date(timestamp * 1000).toISOString() : new Date().toISOString(),
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('[baileys webhook] Failed to insert message:', insertError);
        return NextResponse.json({ error: 'DB insert failed' }, { status: 500 });
      }

      // Update conversation
      await db
        .from('conversations')
        .update({
          last_message_text: text || `[${contentType}]`,
          last_message_at: new Date().toISOString(),
          status: 'open',
          ...(fromMe ? {} : { unread_count: 1 }),
        })
        .eq('id', conversationId);

      if (!fromMe) {
        // Trigger Automations
        runAutomationsForTrigger({
          accountId,
          triggerType: 'new_message_received',
          contactId,
          context: {
            message_text: text || '',
            conversation_id: conversationId,
          },
        }).catch((err) => console.error('[baileys webhook] Automation error:', err));

        // Resume automations waiting for reply
        resumeAwaitingReply({
          accountId,
          contactId,
          context: {
            message_text: text || '',
            conversation_id: conversationId,
          },
        }).catch((err) =>
          console.error('[baileys webhook] Resume reply error:', err)
        );

        // Dispatch to AI Auto-reply
        dispatchInboundToAiReply({
          accountId,
          conversationId,
          contactId,
          configOwnerUserId: configs[0].user_id || accountId,
          inboundMessageId: messageId,
        }).catch((err) => console.error('[baileys webhook] AI reply error:', err));

        // Dispatch to Flows
        dispatchInboundToFlows({
          accountId,
          userId: configs[0].user_id || accountId,
          contactId,
          conversationId,
          message: {
            kind: 'text',
            text: text || '',
            meta_message_id: messageId,
          },
          isFirstInboundMessage: false,
        }).catch((err) => console.error('[baileys webhook] Flow error:', err));

        // Dispatch Webhook event
        dispatchWebhookEvent(db, accountId, 'message.received', {
          id: insertedMsg.id,
          conversation_id: conversationId,
          contact_id: contactId,
          content_text: text,
          content_type: contentType,
        }).catch((err) => console.error('[baileys webhook] Webhook delivery error:', err));
      }

      return NextResponse.json({ ok: true, messageId: insertedMsg.id });
    } catch (err) {
      console.error('[baileys webhook] Error processing inbound:', err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  // 3. Message Status Update
  if (event === 'message_status_update') {
    const { key, update } = data || {};
    const metaId = key?.id;
    if (metaId && update?.status) {
      const statusMap: Record<number, string> = {
        2: 'sent',
        3: 'delivered',
        4: 'read',
      };
      const mapped = statusMap[update.status];
      if (mapped) {
        await db
          .from('messages')
          .update({ status: mapped })
          .eq('message_id', metaId);
      }
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}
