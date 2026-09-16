import { NextResponse, type NextRequest } from 'next/server';

/**
 * A /demo/<slug> page must render in THAT prospect's identity, including the
 * honesty line in the fixed footer and the page's colours — both of which the
 * root layout computes. The layout only knows the skin cookie, and visiting a
 * demo page does not set one (the cookie is set when you tap "Open your store").
 *
 * Caught by eye at 1440x900: the Theory Wellness demo page carried RISE's
 * colours and a footer reading "Not affiliated with RISE or Green Thumb
 * Industries" on a page about a different company. That is precisely the kind of
 * wrong disclaimer the honesty guard exists to prevent.
 *
 * So the slug rides on a request header the layout can read.
 */
export function middleware(req: NextRequest) {
  const m = req.nextUrl.pathname.match(/^\/demo\/([a-z0-9-]{1,80})\/?$/);
  if (!m) return NextResponse.next();
  const headers = new Headers(req.headers);
  headers.set('x-demo-skin', m[1]);
  return NextResponse.next({ request: { headers } });
}

export const config = { matcher: '/demo/:slug*' };
