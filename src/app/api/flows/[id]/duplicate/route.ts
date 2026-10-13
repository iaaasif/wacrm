import { NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';
import { supabaseAdmin } from '@/lib/flows/admin-client';
import { getT } from '@/lib/i18n/translate';

const t = getT('Api');

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  let accountId: string;
  let userId: string;
  try {
    const ctx = await requireRole('agent');
    accountId = ctx.accountId;
    userId = ctx.userId;
  } catch (err) {
    return toErrorResponse(err);
  }

  const admin = supabaseAdmin();

  // Scoped to account for strict multi-tenancy
  const { data: original, error: origErr } = await admin
    .from('flows')
    .select('*')
    .eq('id', id)
    .eq('account_id', accountId)
    .maybeSingle();

  if (origErr) return NextResponse.json({ error: origErr.message }, { status: 500 });
  if (!original) return NextResponse.json({ error: t('common.notFound') }, { status: 404 });

  // 1. Create duplicate flow row in draft status
  const { data: copy, error: copyErr } = await admin
    .from('flows')
    .insert({
      account_id: accountId,
      user_id: userId,
      name: `${original.name} (Copy)`,
      description: original.description,
      trigger_type: original.trigger_type,
      trigger_config: original.trigger_config,
      entry_node_id: original.entry_node_id,
      fallback_policy: original.fallback_policy,
      status: 'draft',
      execution_count: 0,
    })
    .select()
    .single();

  if (copyErr || !copy) {
    return NextResponse.json(
      { error: copyErr?.message ?? 'Failed to duplicate flow' },
      { status: 500 },
    );
  }

  // 2. Duplicate flow nodes
  const { data: originalNodes } = await admin
    .from('flow_nodes')
    .select('*')
    .eq('flow_id', id);

  if (originalNodes && originalNodes.length > 0) {
    const nodesToInsert = originalNodes.map((n) => ({
      flow_id: copy.id,
      node_key: n.node_key,
      node_type: n.node_type,
      config: n.config,
      position_x: n.position_x,
      position_y: n.position_y,
    }));

    const { error: nodesErr } = await admin.from('flow_nodes').insert(nodesToInsert);
    if (nodesErr) {
      console.error('[flows/duplicate] Failed to copy nodes:', nodesErr);
    }
  }

  return NextResponse.json({ success: true, flow: copy });
}
