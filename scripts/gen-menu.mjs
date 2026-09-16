import fs from 'node:fs';

/**
 * DEMO MENU GENERATOR.
 *
 * Cultivar names, brand names, pack formats and price points are the ones read
 * off RISE St. Paul's own public recreational menu on 2026-09-15
 * (https://risecannabis.com/dispensaries/minnesota/st-paul/6456/recreational-menu/),
 * so the shelf reads like theirs rather than like a stock demo.
 *
 * WHAT IS NOT REAL, and is labelled as such everywhere it renders:
 *   - terpene shares. RISE does not publish per-batch terpene percentages on the
 *     menu, so every profile here is a PLAUSIBLE DEMO VALUE consistent with the
 *     cultivar's published lineage and aroma copy. The feeling model rides on
 *     these numbers, so they are the single most important thing to replace with
 *     real COA data on a live build. See docs/feeling-model.md.
 *   - stock counts.
 *   - CBD percentages where the menu did not publish one.
 * THC percentages marked `observed: true` were read off the live menu.
 */

// name, lineage, thcPct, cbdPct, terpene shares (sum ~1), observedTHC
const S = [
  // --- read off the live RISE St. Paul rec menu, 2026-09-15 ---
  ['Animal Face',     'indica', 31.2, 0.01, {myrcene:.30,caryophyllene:.22,pinene:.10,linalool:.14,limonene:.16,terpinolene:.02,humulene:.06}, true],
  ['Animal Scout',    'indica', 23.2, 0.02, {myrcene:.32,caryophyllene:.24,pinene:.08,linalool:.16,limonene:.12,terpinolene:.02,humulene:.06}, true],
  ['Brownie Scout',   'indica', 22.1, 0.01, {myrcene:.36,caryophyllene:.22,pinene:.06,linalool:.18,limonene:.10,terpinolene:.02,humulene:.06}, true],
  ['Giggle Gas',      'hybrid', 23.9, 0.01, {myrcene:.24,caryophyllene:.22,pinene:.10,linalool:.08,limonene:.28,terpinolene:.04,humulene:.04}, true],
  ['Gogurtz',         'hybrid', 28.4, 0.01, {myrcene:.22,caryophyllene:.26,pinene:.08,linalool:.10,limonene:.26,terpinolene:.03,humulene:.05}, true],
  ['Bananaconda',     'hybrid', 21.4, 0.02, {myrcene:.26,caryophyllene:.20,pinene:.09,linalool:.09,limonene:.28,terpinolene:.03,humulene:.05}, true],
  ['Runtz S1',        'hybrid', 21.0, 0.01, {myrcene:.24,caryophyllene:.24,pinene:.08,linalool:.12,limonene:.24,terpinolene:.03,humulene:.05}, true],
  ['Sunset Sherbet',  'hybrid', 22.5, 0.01, {myrcene:.28,caryophyllene:.22,pinene:.08,linalool:.12,limonene:.22,terpinolene:.03,humulene:.05}, true],
  ['Durban Z',        'sativa', 20.0, 0.03, {myrcene:.10,caryophyllene:.12,pinene:.18,linalool:.03,limonene:.16,terpinolene:.34,humulene:.07}, true],
  ['Granny Candy',    'sativa', 22.8, 0.01, {myrcene:.14,caryophyllene:.12,pinene:.20,linalool:.04,limonene:.32,terpinolene:.12,humulene:.06}, true],
  ["L'Orange",        'sativa', 17.4, 0.01, {myrcene:.12,caryophyllene:.12,pinene:.16,linalool:.04,limonene:.40,terpinolene:.10,humulene:.06}, true],
  // --- widely-known public cultivars, added for breadth of the feeling space ---
  ['Granddaddy Purple','indica',20.5, 0.10, {myrcene:.42,caryophyllene:.18,pinene:.06,linalool:.16,limonene:.10,terpinolene:.02,humulene:.06}, false],
  ['Northern Lights', 'indica', 18.2, 0.20, {myrcene:.38,caryophyllene:.16,pinene:.10,linalool:.14,limonene:.12,terpinolene:.02,humulene:.08}, false],
  ['Bubba Kush',      'indica', 22.1, 0.10, {myrcene:.34,caryophyllene:.24,pinene:.07,linalool:.15,limonene:.11,terpinolene:.01,humulene:.08}, false],
  ['Lavender',        'indica', 17.6, 0.40, {myrcene:.28,caryophyllene:.18,pinene:.06,linalool:.28,limonene:.12,terpinolene:.02,humulene:.06}, false],
  ['Blue Dream',      'hybrid', 19.6, 0.20, {myrcene:.32,caryophyllene:.14,pinene:.14,linalool:.06,limonene:.22,terpinolene:.04,humulene:.08}, false],
  ['Wedding Cake',    'hybrid', 23.9, 0.10, {myrcene:.24,caryophyllene:.26,pinene:.08,linalool:.12,limonene:.20,terpinolene:.02,humulene:.08}, false],
  ['White Widow',     'hybrid', 18.9, 0.20, {myrcene:.26,caryophyllene:.20,pinene:.16,linalool:.06,limonene:.18,terpinolene:.06,humulene:.08}, false],
  ['Jack Herer',      'sativa', 20.4, 0.20, {myrcene:.14,caryophyllene:.12,pinene:.26,linalool:.04,limonene:.18,terpinolene:.20,humulene:.06}, false],
  ['Green Crack',     'sativa', 21.7, 0.10, {myrcene:.16,caryophyllene:.10,pinene:.20,linalool:.03,limonene:.36,terpinolene:.09,humulene:.06}, false],
  ['Super Lemon Haze','sativa', 20.8, 0.10, {myrcene:.12,caryophyllene:.12,pinene:.16,linalool:.04,limonene:.40,terpinolene:.10,humulene:.06}, false],
  ['Strawberry Cough','sativa', 19.2, 0.20, {myrcene:.16,caryophyllene:.14,pinene:.18,linalool:.05,limonene:.26,terpinolene:.15,humulene:.06}, false],
  // --- CBD-forward. RISE St. Paul carries a CBD category; these are public cultivars. ---
  ['ACDC',            'hybrid',  6.2, 14.8, {myrcene:.30,caryophyllene:.20,pinene:.14,linalool:.08,limonene:.16,terpinolene:.05,humulene:.07}, false],
  ['Harlequin',       'sativa',  7.4, 10.6, {myrcene:.22,caryophyllene:.18,pinene:.18,linalool:.06,limonene:.24,terpinolene:.06,humulene:.06}, false],
  ['Cannatonic',      'hybrid',  7.1, 12.2, {myrcene:.28,caryophyllene:.22,pinene:.12,linalool:.10,limonene:.18,terpinolene:.04,humulene:.06}, false],
  ["Ringo's Gift",    'hybrid',  5.8, 15.4, {myrcene:.26,caryophyllene:.24,pinene:.13,linalool:.09,limonene:.17,terpinolene:.04,humulene:.07}, false],
];

// Pack formats and prices as published on the RISE St. Paul rec menu, 2026-09-15.
const FORMATS = {
  flower:   {label:'Premium Flower', unit:'3.5g',  onset:'5-10 min',  duration:'2-3 hr', price:5000},
  minibuds: {label:'Mini Buds',      unit:'7g',    onset:'5-10 min',  duration:'2-3 hr', price:8000},
  preroll:  {label:'5 Pack Mini Dogs', unit:'5 x 0.35g', onset:'5-10 min', duration:'1-2 hr', price:3000},
  bigdog:   {label:'Big Dog Pre-Roll', unit:'0.75g', onset:'5-10 min', duration:'1-2 hr', price:1500},
  vape:     {label:'Live Resin Cartridge', unit:'0.5g', onset:'2-5 min', duration:'1-2 hr', price:6000},
  edible:   {label:'Gummies',        unit:'10 x 5mg', onset:'45-90 min', duration:'4-8 hr', price:2500},
  beverage: {label:'Hemp Beverage',  unit:'12oz',  onset:'15-45 min', duration:'2-4 hr', price:700},
  tincture: {label:'Tincture',       unit:'30ml',  onset:'15-45 min', duration:'4-6 hr', price:4500},
};
// which real house brand sells which format at RISE St. Paul
const BRAND_FOR = {
  flower:'RYTHM', minibuds:'RYTHM', vape:'RYTHM', beverage:'RYTHM',
  preroll:'Dogwalkers', bigdog:'Dogwalkers',
  edible:'Good Green', tincture:"Dr. Solomon's",
};
const STORE = 'ford-pkwy';
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');

let seed = 20260915;
const rnd = () => (seed = (seed*1664525 + 1013904223) % 4294967296) / 4294967296;

const products = [];
for (const [name, lineage, thc, cbd, terps, observed] of S) {
  const strainSlug = slugify(name);
  const cbdForward = cbd > thc;
  // CBD-forward cultivars ship the gentle formats; THC-forward ship the RISE line-up
  const pool = cbdForward
    ? ['flower','tincture','edible']
    : ['flower','minibuds','preroll','bigdog','vape','edible','beverage','tincture'];
  const n = 2 + Math.floor(rnd()*2);
  const picked = [];
  for (let i=0;i<n;i++){ const f = pool[Math.floor(rnd()*pool.length)]; if(!picked.includes(f)) picked.push(f); }
  if (!picked.includes('flower')) picked.unshift('flower');

  for (const fmt of picked) {
    const f = FORMATS[fmt];
    const isDose = fmt==='edible' || fmt==='tincture' || fmt==='beverage';
    const thcMgPerServing = fmt==='edible' ? 5 : fmt==='tincture' ? 10 : fmt==='beverage' ? 10 : null;
    const servings = fmt==='edible' ? 10 : fmt==='tincture' ? 30 : fmt==='beverage' ? 1 : null;
    const grams = fmt==='flower' ? 3.5 : fmt==='minibuds' ? 7 : fmt==='preroll' ? 1.75 : fmt==='bigdog' ? 0.75 : fmt==='vape' ? 0.5 : 0;
    // live resin carts on the menu run ~80% THC regardless of the flower figure
    const potency = fmt==='vape' ? 80 : isDose ? null : thc;
    const strength = isDose
      ? (thcMgPerServing <= 5 ? 'gentle' : thcMgPerServing <= 10 ? 'standard' : 'strong')
      : (potency < 12 ? 'gentle' : potency < 24 ? 'standard' : 'strong');
    products.push({
      id: `${strainSlug}-${fmt}`,
      slug: `${strainSlug}-${fmt}`,
      name: `${name} ${f.label}`,
      strain: name,
      strainSlug,
      brand: BRAND_FOR[fmt],
      lineage,
      format: fmt,
      formatLabel: f.label,
      size: f.unit,
      onset: f.onset,
      duration: f.duration,
      thcPct: isDose ? null : potency,
      cbdPct: isDose ? null : cbd,
      thcObserved: !!observed && fmt === 'flower',
      thcMgPerServing,
      servings,
      totalThcMg: isDose
        ? thcMgPerServing * servings
        : Math.round((potency/100) * grams * 1000),
      strength,
      terpenes: terps,
      priceCents: f.price,
      stock: { [STORE]: Math.floor(rnd()*16) },
    });
  }
}
fs.writeFileSync(new URL('../data/menu.json', import.meta.url), JSON.stringify(products, null, 1));
console.log('products:', products.length, 'strains:', S.length,
  'in stock:', products.filter(p=>p.stock[STORE]>0).length);
