import { NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';
import { resolveConversationByPhone } from '@/lib/whatsapp/resolve-conversation';
import { CONVERSATION_SELECT, normalizeConversation } from '@/lib/inbox/conversations';

export async function POST(request: Request) {
  try {
    const { supabase, accountId } = await requireRole('agent');

    const body = await request.json().catch(() => ({}));
    const { phone, name } = body;

    if (!phone || typeof phone !== 'string' || !phone.trim()) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    // Clean phone number: if no leading +, add +
    let cleanPhone = phone.trim().replace(/[\s\-()]/g, '');
    if (!cleanPhone.startsWith('+')) {
      cleanPhone = `+${cleanPhone}`;
    }

    const resolved = await resolveConversationByPhone(
      supabase,
      accountId,
      cleanPhone,
      typeof name === 'string' && name.trim() ? name.trim() : null
    );

    // Fetch full conversation object for the client
    const { data: conv, error: convError } = await supabase
      .from('conversations')
      .select(CONVERSATION_SELECT)
      .eq('id', resolved.conversationId)
      .single();

    if (convError || !conv) {
      return NextResponse.json({ conversation_id: resolved.conversationId });
    }

    return NextResponse.json({
      conversation_id: resolved.conversationId,
      conversation: normalizeConversation(conv),
    });
  } catch (error) {
    console.error('[open conversation] error:', error);
    return toErrorResponse(error);
  }
}
