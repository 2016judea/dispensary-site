#!/usr/bin/env node
/**
 * Generate a per-prospect skin: `node scripts/skin.mjs <slug|--all>`
 *
 * Reads data/prospects.json (248 licensed MN retailers, with a measured `scan`
 * on the Saint Paul ones) and writes data/skins/<slug>.json - the same shape as
 * brand.json, so the whole site renders under it.
 *
 * Colours: fetched from the prospect's OWN site where they have one. We pull the
 * homepage plus its first few stylesheets, count hex and rgb() colours, and take
 * the most-used dark one as the accent and the most-used light one as the ground.
 * Where that fails (no site, empty site, no usable colour) we fall back to a
 * neutral ink-on-paper default and record `colorSource: "default"` so the skin
 * never claims to have matched a brand it could not see.
 *
 * We never reproduce a logo. The wordmark is the prospect's real NAME set in the
 * site's own type.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const PROSPECTS = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/prospects.json'), 'utf8'));
const OUT = path.join(ROOT, 'data/skins');
fs.mkdirSync(OUT, { recursive: true });

const DEFAULT_ACCENT = '#1F2421';
const DEFAULT_GROUND = '#F3F1EC';
const DEFAULT_DIAL = '#C8553D';

const hexOf = (r, g, b) => '#' + [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('').toUpperCase();
function lum(hex) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function sat(hex) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  return mx === 0 ? 0 : (mx - mn) / mx;
}

async function grab(url, ms = 9000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctl.signal, redirect: 'follow',
      headers: { 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/131 Safari/537.36' } });
    if (!res.ok) return null;
    return await res.text();
  } catch { return null; } finally { clearTimeout(t); }
}

function census(css) {
  const counts = new Map();
  const bump = (hex) => counts.set(hex, (counts.get(hex) ?? 0) + 1);
  for (const m of css.matchAll(/#([0-9a-fA-F]{6})\b/g)) bump('#' + m[1].toUpperCase());
  for (const m of css.matchAll(/#([0-9a-fA-F]{3})\b/g)) {
    const s = m[1]; bump('#' + (s[0] + s[0] + s[1] + s[1] + s[2] + s[2]).toUpperCase());
  }
  for (const m of css.matchAll(/rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)/g)) bump(hexOf(+m[1], +m[2], +m[3]));
  return counts;
}

async function colorsFor(p) {
  const site = p.scan?.ok ? (p.scan.final || p.scan.url) : null;
  if (!site) return { accent: DEFAULT_ACCENT, ground: DEFAULT_GROUND, dial: DEFAULT_DIAL, colorSource: 'default' };
  const html = await grab(site);
  if (!html) return { accent: DEFAULT_ACCENT, ground: DEFAULT_GROUND, dial: DEFAULT_DIAL, colorSource: 'default' };
  let css = html;
  const sheets = [...html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]*href=["']([^"']+)["']/gi)]
    .map((m) => m[1]).slice(0, 4);
  for (const href of sheets) {
    let u; try { u = new URL(href, site).toString(); } catch { continue; }
    const t = await grab(u, 7000);
    if (t) css += '\n' + t.slice(0, 400_000);
  }
  const counts = [...census(css).entries()].sort((a, b) => b[1] - a[1]);
  const dark = counts.find(([h, n]) => n >= 2 && lum(h) < 0.38 && sat(h) > 0.12)
            ?? counts.find(([h]) => lum(h) < 0.30);
  const light = counts.find(([h, n]) => n >= 2 && lum(h) > 0.86)
             ?? counts.find(([h]) => lum(h) > 0.90);
  const accentPick = counts.find(([h, n]) => n >= 2 && sat(h) > 0.45 && lum(h) > 0.25 && lum(h) < 0.72);
  if (!dark && !light) return { accent: DEFAULT_ACCENT, ground: DEFAULT_GROUND, dial: DEFAULT_DIAL, colorSource: 'default' };
  return {
    accent: dark ? dark[0] : DEFAULT_ACCENT,
    ground: light ? light[0] : DEFAULT_GROUND,
    dial: accentPick ? accentPick[0] : DEFAULT_DIAL,
    colorSource: site,
  };
}

const titleCase = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());

async function build(p) {
  const colors = await colorsFor(p);
  const scan = p.scan ?? { ok: false, error: 'not scanned' };
  const skin = {
    slug: p.slug,
    storeName: p.name,
    legalName: p.name,
    tagline: `${p.city === 'St Paul' ? 'Saint Paul' : p.city}, MN`,
    headline: 'What sort of feeling are you chasing?',
    wordmark: p.name,
    wordmarkNote: 'placeholder wordmark - the store name set in this site\'s own typeface. No logo of theirs is reproduced.',
    colors: { accent: colors.accent, ground: colors.ground, dial: colors.dial },
    colorSource: colors.colorSource,
    phone: p.phone || '',
    email: '',
    licenseNumber: '',
    url: '',
    sourceUrl: p.website || '',
    verifiedOn: new Date().toISOString().slice(0, 10),
    rating: p.rating ?? null,
    reviews: p.reviews ?? null,
    openerFact: p.opener_fact ?? '',
    scan,
    stores: [{
      id: p.slug,
      name: titleCase(p.city === 'St Paul' ? 'Saint Paul' : p.city),
      street: p.street,
      city: p.city === 'St Paul' ? 'Saint Paul' : p.city,
      state: 'MN',
      zip: p.zip,
      lat: p.lat, lng: p.lon,
      phone: p.phone || '',
      // NOT VERIFIED per store. Rendered with an explicit "hours to confirm" mark.
      hours: null,
    }],
  };
  fs.writeFileSync(path.join(OUT, `${p.slug}.json`), JSON.stringify(skin, null, 1));
  return skin;
}

const arg = process.argv[2];
// rise-st-paul is excluded: brand.json is the hand-verified RISE skin (hours,
// phone, licence and colours all read off their live site by eye on 2026-09-15),
// and their server 403s a plain fetch so the automatic colour pass cannot beat it.
const targets = arg === '--all' || !arg
  ? PROSPECTS.filter((p) => p.scan && p.slug !== 'rise-st-paul')
  : PROSPECTS.filter((p) => p.slug === arg);
if (!targets.length) {
  console.error(`no prospect matched "${arg}". Try --all, or one of:`);
  console.error(PROSPECTS.filter((p) => p.scan).map((p) => '  ' + p.slug).join('\n'));
  process.exit(1);
}
for (const p of targets) {
  const s = await build(p);
  console.log(`${p.slug.padEnd(38)} accent ${s.colors.accent}  ground ${s.colors.ground}  from ${s.colorSource === 'default' ? 'DEFAULT' : 'their site'}`);
}

// One bundler-safe index the app imports, rather than a dynamic require per slug.
const index = {};
for (const f of fs.readdirSync(OUT)) {
  if (!f.endsWith('.json') || f === 'index.json') continue;
  const skin = JSON.parse(fs.readFileSync(path.join(OUT, f), 'utf8'));
  index[skin.slug] = skin;
}
fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(index, null, 1));
console.log(`\nwrote data/skins/index.json with ${Object.keys(index).length} skins`);
