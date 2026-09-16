import { NextResponse } from 'next/server';
import { docusignConfig, createSigningSession } from '@/lib/docusign';
import { agreementHtml } from '@/lib/agreement';
import { loadSkin, RISE } from '@/lib/brand';
import { cookies } from 'next/headers';
import { SKIN_COOKIE } from '@/lib/session';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  let body: any = {};
  try { body = await req.json(); } catch { /* empty body is fine */ }
  const jar = await cookies();
  const b = loadSkin(jar.get(SKIN_COOKIE)?.value) ?? RISE;
  const fee = process.env.AGREEMENT_FEE || 'To be set before this is sent to anyone.';
  const cfg = docusignConfig();
  if (!cfg) {
    return NextResponse.json({
      mode: 'simulated', url: null, envelopeId: null,
      reason: 'DOCUSIGN_INTEGRATION_KEY / USER_ID / ACCOUNT_ID / PRIVATE_KEY are not set on this deployment.',
      html: agreementHtml(b, fee),
    });
  }
  try {
    const session = await createSigningSession(cfg, {
      name: String(body.name || 'Owner'), email: String(body.email || ''),
    }, agreementHtml(b, fee));
    return NextResponse.json(session);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'docusign failed' }, { status: 502 });
  }
}
