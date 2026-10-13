import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/automations/admin-client';
import { resolveConversationByPhone } from '@/lib/whatsapp/resolve-conversation';
import { runAutomationsForTrigger, resumeAwaitingReply } from '@/lib/automations/engine';
import { dispatchInboundToAiReply } from '@/lib/ai/auto-reply';
import { dispatchInboundToFlows } from '@/lib/flows/engine';
import { dispatchWebhookEvent } from '@/lib/webhooks/deliver';
import { extensionForMime } from '@/lib/media/filename';

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

  // 2. Inbound Reaction
  if (event === 'inbound_reaction') {
    const { targetMessageId, emoji, remotePhone, senderPhone, fromMe } = data || {};
    if (!targetMessageId) {
      return NextResponse.json({ ok: true });
    }

    let { data: configs } = await db
      .from('whatsapp_config')
      .select('id, account_id, user_id')
      .eq('provider', 'baileys')
      .limit(1);

    if (!configs || configs.length === 0) {
      const { data: fallback } = await db.from('whatsapp_config').select('id, account_id, user_id').limit(1);
      configs = fallback;
    }
    const accountId = configs?.[0]?.account_id;
    if (!accountId) return NextResponse.json({ ok: true });

    const { data: targetMessage } = await db
      .from('messages')
      .select('id, conversation_id')
      .eq('message_id', targetMessageId)
      .maybeSingle();

    if (!targetMessage) return NextResponse.json({ ok: true, notice: 'Message not found' });

    const phone = remotePhone || senderPhone;
    const cleanPhone = phone ? (phone.startsWith('+') ? phone : `+${phone}`) : '';
    if (!cleanPhone) return NextResponse.json({ ok: true });

    const resolved = await resolveConversationByPhone(db, accountId, cleanPhone);
    const contactId = resolved.contactId;

    if (emoji === '') {
      await db
        .from('message_reactions')
        .delete()
        .eq('message_id', targetMessage.id)
        .eq('actor_type', fromMe ? 'agent' : 'customer');
    } else {
      await db
        .from('message_reactions')
        .upsert({
          message_id: targetMessage.id,
          actor_type: fromMe ? 'agent' : 'customer',
          actor_id: fromMe ? (configs?.[0]?.user_id || accountId) : contactId,
          emoji,
        }, { onConflict: 'message_id,actor_type,actor_id' });
    }

    return NextResponse.json({ ok: true });
  }

  // 3. Inbound message
  if (event === 'inbound_message') {
    const msg = data?.message;
    if (!msg) {
      return NextResponse.json({ ok: true });
    }

    const { id: messageId, fromMe, senderPhone, remoteJid, type, text, timestamp, pushName } = msg;

    // Find the active account for Baileys
    let { data: configs } = await db
      .from('whatsapp_config')
      .select('id, account_id, user_id, baileys_phone')
      .eq('provider', 'baileys')
      .limit(1);

    if (!configs || configs.length === 0) {
      const { data: fallbackConfigs } = await db
        .from('whatsapp_config')
        .select('id, account_id, user_id, baileys_phone')
        .limit(1);
      configs = fallbackConfigs;
    }

    if (!configs || configs.length === 0) {
      return NextResponse.json({ ok: true, notice: 'No Baileys account configured' });
    }

    const accountId = configs[0].account_id;
    const connectedPhone = configs[0].baileys_phone?.replace(/[^0-9]/g, '') || '';

    // Remote phone: extract digits from remoteJid (handles @s.whatsapp.net, @lid, etc.)
    // or fallback to msg.remotePhone
    const rawRemote = remoteJid ? remoteJid.split('@')[0].split(':')[0] : (msg.remotePhone || '');
    const cleanRemotePhone = rawRemote.replace(/[^0-9]/g, '');
    const cleanSenderPhone = (senderPhone || '').replace(/[^0-9]/g, '');

    // In WhatsApp 1-on-1 messaging:
    // If fromMe is TRUE:
    //   The user sent a message from their phone TO the contact at cleanRemotePhone.
    //   The conversation MUST be with cleanRemotePhone!
    //   The sender_type MUST be 'agent' (outbound message sent by us).
    // If fromMe is FALSE:
    //   The customer at cleanRemotePhone sent a message TO us.
    //   The conversation MUST be with cleanRemotePhone (or cleanSenderPhone).
    //   The sender_type MUST be 'customer' (inbound message received from customer).
    const targetDigits = fromMe
      ? (cleanRemotePhone || cleanSenderPhone)
      : (cleanRemotePhone || cleanSenderPhone);

    if (!targetDigits) {
      return NextResponse.json({ ok: true, notice: 'No target phone' });
    }

    // Outbound messages sent from phone are 'agent'; inbound messages from customer are 'customer'
    const senderType: 'agent' | 'customer' = fromMe ? 'agent' : 'customer';

    // Format phone with leading '+'
    const cleanPhone = targetDigits.startsWith('+') ? targetDigits : `+${targetDigits}`;
    const displayName = pushName || msg.senderName || msg.rawMessage?.pushName || null;

    try {
      const resolved = await resolveConversationByPhone(db, accountId, cleanPhone, displayName);
      const conversationId = resolved.conversationId;
      const contactId = resolved.contactId;

      // Update contact name if display name is available and contact has no custom name yet
      if (displayName && contactId) {
        await db
          .from('contacts')
          .update({ name: displayName })
          .eq('id', contactId)
          .or(`name.is.null,name.eq.${targetDigits},name.eq.+${targetDigits}`);
      }

      // Check if message already exists (deduplication)
      const { data: existingMsg } = await db
        .from('messages')
        .select('id')
        .eq('message_id', messageId)
        .maybeSingle();

      if (existingMsg) {
        return NextResponse.json({ ok: true, notice: 'Already processed' });
      }

      // Helper to recursively unwrap Baileys nested messages (deviceSentMessage, ephemeral, viewOnce, etc.)
      const unwrapBaileysRaw = (rawMsg: any): { text: string; type: string } => {
        let textCandidate = typeof text === 'string' ? text.trim() : '';
        let typeCandidate = ['image', 'video', 'audio', 'document'].includes(type) ? type : 'text';

        let m = rawMsg?.message || rawMsg || {};
        for (let i = 0; i < 8; i++) {
          if (m?.deviceSentMessage?.message) {
            m = m.deviceSentMessage.message;
          } else if (m?.ephemeralMessage?.message) {
            m = m.ephemeralMessage.message;
          } else if (m?.viewOnceMessage?.message) {
            m = m.viewOnceMessage.message;
          } else if (m?.viewOnceMessageV2?.message) {
            m = m.viewOnceMessageV2.message;
          } else if (m?.documentWithCaptionMessage?.message) {
            m = m.documentWithCaptionMessage.message;
          } else if (m?.editedMessage?.message?.protocolMessage?.editedMessage) {
            m = m.editedMessage.message.protocolMessage.editedMessage;
          } else {
            break;
          }
        }

        if (!textCandidate && m) {
          if (typeof m.conversation === 'string' && m.conversation.trim()) {
            textCandidate = m.conversation.trim();
          } else if (typeof m.extendedTextMessage?.text === 'string' && m.extendedTextMessage.text.trim()) {
            textCandidate = m.extendedTextMessage.text.trim();
          } else if (typeof m.imageMessage?.caption === 'string' && m.imageMessage.caption.trim()) {
            textCandidate = m.imageMessage.caption.trim();
            typeCandidate = 'image';
          } else if (typeof m.videoMessage?.caption === 'string' && m.videoMessage.caption.trim()) {
            textCandidate = m.videoMessage.caption.trim();
            typeCandidate = 'video';
          } else if (typeof m.documentMessage?.caption === 'string' && m.documentMessage.caption.trim()) {
            textCandidate = m.documentMessage.caption.trim();
            typeCandidate = 'document';
          } else if (typeof m.templateButtonReplyMessage?.selectedDisplayText === 'string') {
            textCandidate = m.templateButtonReplyMessage.selectedDisplayText.trim();
          } else if (typeof m.buttonsResponseMessage?.selectedDisplayText === 'string') {
            textCandidate = m.buttonsResponseMessage.selectedDisplayText.trim();
          } else if (typeof m.listResponseMessage?.title === 'string') {
            textCandidate = m.listResponseMessage.title.trim();
          } else if (typeof m.interactiveResponseMessage?.body?.text === 'string') {
            textCandidate = m.interactiveResponseMessage.body.text.trim();
          }
        }

        return { text: textCandidate, type: typeCandidate };
      };

      const extracted = unwrapBaileysRaw(msg.rawMessage);
      const effectiveText = extracted.text || (typeof text === 'string' ? text.trim() : '');
      const contentType = extracted.type || (['image', 'video', 'audio', 'document'].includes(type) ? type : 'text');

      // If media buffer was captured by Baileys, mirror it into chat-media storage
      let mediaUrl: string | null = null;
      if (msg.media?.base64) {
        try {
          const buffer = Buffer.from(msg.media.base64, 'base64');
          const ext = extensionForMime(msg.media.mimeType) || 'bin';
          const storageFileName = `${messageId}-${Date.now()}.${ext}`;
          const storagePath = `account-${accountId}/inbound/${storageFileName}`;
          const { error: uploadErr } = await db.storage
            .from('chat-media')
            .upload(storagePath, buffer, {
              contentType: msg.media.mimeType,
              upsert: true,
            });
          if (!uploadErr) {
            const { data: publicUrlData } = db.storage.from('chat-media').getPublicUrl(storagePath);
            mediaUrl = publicUrlData?.publicUrl || null;
          }
        } catch (uploadCatch) {
          console.error('[baileys webhook] Media upload error:', uploadCatch);
        }
      }

      // Guard: Do not insert empty phantom text messages (e.g. protocol messages or sync markers)
      if (!effectiveText && !mediaUrl && contentType === 'text') {
        return NextResponse.json({ ok: true, notice: 'Ignored empty or protocol message' });
      }

      // Insert message
      const { data: insertedMsg, error: insertError } = await db
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_type: senderType,
          content_type: contentType,
          content_text: effectiveText,
          media_url: mediaUrl,
          media_type: msg.media?.mimeType || null,
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
      const summaryText = effectiveText || (mediaUrl ? `[${contentType}]` : null);
      await db
        .from('conversations')
        .update({
          ...(summaryText ? { last_message_text: summaryText } : {}),
          last_message_at: new Date().toISOString(),
          status: 'open',
          ...(senderType === 'customer' ? { unread_count: 1 } : {}),
        })
        .eq('id', conversationId);

      if (!fromMe) {
        // Flip latest broadcast recipient row for this contact to 'replied'
        const { data: latestRec } = await db
          .from('broadcast_recipients')
          .select('id, status')
          .eq('contact_id', contactId)
          .in('status', ['sent', 'delivered', 'read'])
          .order('id', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestRec) {
          await db
            .from('broadcast_recipients')
            .update({ status: 'replied' })
            .eq('id', latestRec.id);
        }

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

  // 4. Message Status Update
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

        // Mirror onto broadcast_recipients
        const { data: rec } = await db
          .from('broadcast_recipients')
          .select('id, status')
          .eq('whatsapp_message_id', metaId)
          .maybeSingle();

        if (rec) {
          const recUpdate: Record<string, unknown> = { status: mapped };
          if (mapped === 'delivered') recUpdate.delivered_at = new Date().toISOString();
          if (mapped === 'read') recUpdate.read_at = new Date().toISOString();
          await db
            .from('broadcast_recipients')
            .update(recUpdate)
            .eq('id', rec.id);
        }
      }
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}
