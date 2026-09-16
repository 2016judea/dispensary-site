import { NextResponse } from 'next/server';
import { getAeropay } from '@/lib/aeropay';

export const runtime = 'nodejs';

/**
 * Link a bank, inline on the checkout screen, the first time only.
 *
 * Live, this is two Aeropay calls and an AeroSync widget in between: create the
 * user, fetch aggregator credentials, the shopper picks their bank in the
 * widget, then linkAccountFromAggregator with the connection id it returns.
 * With no AEROPAY_* keys set the simulated client returns the same shapes, so
 * the screen is exercised end to end. See lib/aeropay.ts.
 */
export async function POST(req: Request) {
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }); }
  const ap = getAeropay();
  try {
    const user = body.aeropayUserId
      ? { id: String(body.aeropayUserId) }
      : await ap.createUser({
          firstName: String(body.firstName ?? ''), lastName: String(body.lastName ?? ''),
          email: String(body.email ?? ''), phone: String(body.phone ?? ''),
        });
    if (ap.mode === 'live' && !body.connectionId) {
      const creds = await ap.aerosyncCredentials(user.id);
      return NextResponse.json({ mode: ap.mode, aeropayUserId: user.id, aerosync: creds, needsWidget: true });
    }
    const bank = await ap.linkAccount(user.id, String(body.connectionId ?? 'sim'));
    return NextResponse.json({ mode: ap.mode, aeropayUserId: user.id, bank });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'link failed' }, { status: 502 });
  }
}
