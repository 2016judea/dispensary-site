import { NextResponse } from 'next/server';
import { loadSkin } from '@/lib/brand';
import { SKIN_COOKIE } from '@/lib/session';

export const runtime = 'nodejs';

/** Put the visitor into a prospect's skin, then drop them on the landing screen. */
export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const skin = loadSkin(slug);
  if (!skin) return NextResponse.redirect(new URL('/demo', req.url));
  const res = NextResponse.redirect(new URL('/', req.url));
  res.cookies.set(SKIN_COOKIE, slug, { path: '/', maxAge: 60 * 60 * 24 * 30, sameSite: 'lax' });
  return res;
}
