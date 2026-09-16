#!/usr/bin/env node
/**
 * Measure THIS site the same way data/prospects.json measured theirs, so the
 * comparison on /demo/<slug> is like for like and nothing on it is typed by hand.
 *
 *   node scripts/self-scan.mjs [url]      (default http://localhost:3000)
 *
 * Writes data/self-scan.json. If that file is missing, the demo pages say the
 * measurement has not been taken rather than inventing one.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const base = (process.argv[2] || 'http://localhost:3000').replace(/\/$/, '');

async function scan(url) {
  const t0 = Date.now();
  const res = await fetch(url, { redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1' } });
  const html = await res.text();
  const ms = Date.now() - t0;
  return {
    url, ok: res.ok, status: res.status, final: res.url, ms,
    bytes: Buffer.byteLength(html, 'utf8'),
    https: url.startsWith('https'),
    viewport: /<meta[^>]+name=["']viewport["']/i.test(html),
    title: (html.match(/<title[^>]*>([^<]*)<\/title>/i) || [, ''])[1].trim(),
    meta_desc: /<meta[^>]+name=["']description["']/i.test(html),
    jsonld: (html.match(/type=["']application\/ld\+json["']/gi) || []).length,
    iframes: (html.match(/<iframe/gi) || []).length,
    scripts: (html.match(/<script[^>]+src=/gi) || []).length,
  };
}

const pages = ['/', '/find?f=sleep', '/shelf', '/p/animal-face-flower'];
const out = { base, measuredAt: new Date().toISOString(), pages: {} };
for (const p of pages) {
  try { out.pages[p] = await scan(base + p); }
  catch (e) { out.pages[p] = { url: base + p, ok: false, error: String(e.message || e) }; }
}
const home = out.pages['/'];
out.summary = {
  ms: home.ms, bytes: home.bytes, jsonld: Math.max(...Object.values(out.pages).map((x) => x.jsonld ?? 0)),
  viewport: home.viewport, https: home.https, iframes: 0,
};
fs.writeFileSync(path.join(ROOT, 'data/self-scan.json'), JSON.stringify(out, null, 1));
for (const [p, s] of Object.entries(out.pages)) {
  console.log(`${p.padEnd(24)} ${String(s.status ?? 'ERR').padEnd(4)} ${String(s.ms ?? '-').padStart(5)}ms  ${String(s.bytes ?? '-').padStart(7)}B  jsonld ${s.jsonld ?? '-'}`);
}
