import type { Metadata, Viewport } from 'next';
import './globals.css';
import { currentBrand } from '@/lib/session';
import { MN_WARNING, honestyLine } from '@/lib/brand';

export const viewport: Viewport = {
  width: 'device-width', initialScale: 1, viewportFit: 'cover',
};

export async function generateMetadata(): Promise<Metadata> {
  const b = await currentBrand();
  return {
    // The honesty guard. Nothing here is ever to be indexed or mistaken for
    // the real retailer's site. See docs/compliance-mn.md.
    robots: { index: false, follow: false, nocache: true },
    title: { default: `${b.storeName} — ${b.tagline}`, template: `%s — ${b.storeName}` },
    description: `Independent concept build. Pick a feeling, get one product, pick it up at ${b.stores[0]?.street ?? b.tagline}.`,
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://dispensary-site.vercel.app'),
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const b = await currentBrand();
  const css = `:root{--accent:${b.colors.accent};--ground:${b.colors.ground};--dial:${b.colors.dial}}`;
  return (
    <html lang="en">
      <head>
        <meta name="robots" content="noindex,nofollow" />
        <style dangerouslySetInnerHTML={{ __html: css }} />
        {/* Vercel Web Analytics (enabled on the project 2026-10-08). */}
        <script dangerouslySetInnerHTML={{ __html: 'window.va=window.va||function(){(window.vaq=window.vaq||[]).push(arguments)};' }} />
        <script defer src="/_vercel/insights/script.js" />
      </head>
      <body>
        {children}
        <p className="foot">
          {honestyLine(b)} <a href="/about">What this is</a>
        </p>
        <span hidden>{MN_WARNING}</span>
      </body>
    </html>
  );
}
