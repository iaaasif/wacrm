import { NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';
import { STARTER_TEMPLATES } from '@/lib/whatsapp/starter-templates';

export async function GET() {
  return NextResponse.json({ templates: STARTER_TEMPLATES });
}

export async function POST(request: Request) {
  try {
    const { supabase, accountId, userId } = await requireRole('admin');

    let body: { templateNames?: string[] } = {};
    try {
      body = await request.json();
    } catch {
      // Body is optional; empty body installs all starter templates.
    }

    const requestedNames = body.templateNames && body.templateNames.length > 0
      ? new Set(body.templateNames)
      : null;

    const templatesToInstall = requestedNames
      ? STARTER_TEMPLATES.filter((t) => requestedNames.has(t.name))
      : STARTER_TEMPLATES;

    let installedCount = 0;
    let skippedCount = 0;

    for (const template of templatesToInstall) {
      // Check if template with same user and name already exists
      const { data: existing } = await supabase
        .from('message_templates')
        .select('id')
        .eq('user_id', userId)
        .eq('name', template.name)
        .maybeSingle();

      if (existing) {
        skippedCount++;
        continue;
      }

      const { error: insertError } = await supabase.from('message_templates').insert({
        account_id: accountId,
        user_id: userId,
        name: template.name,
        category: template.category,
        language: template.language,
        header_type: template.header_type ?? null,
        header_content: template.header_content ?? null,
        body_text: template.body_text,
        footer_text: template.footer_text ?? null,
        buttons: template.buttons ?? null,
        sample_values: template.sample_values ?? null,
        status: 'APPROVED',
        meta_template_id: `local-starter-${crypto.randomUUID()}`,
        last_submitted_at: new Date().toISOString(),
      });

      if (insertError) {
        console.error(`Failed to insert starter template ${template.name}:`, insertError);
      } else {
        installedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      installed: installedCount,
      skipped: skippedCount,
      total: templatesToInstall.length,
    });
  } catch (err: unknown) {
    return toErrorResponse(err);
  }
}
