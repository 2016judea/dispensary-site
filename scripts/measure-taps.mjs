#!/usr/bin/env node
/**
 * Print the measured tap counts. Runs against a RUNNING build, because it calls
 * /api/measure, which walks the real shipped question engine.
 *
 *   npm run start &   (or npm run dev)
 *   node scripts/measure-taps.mjs [base-url]
 */
const base = (process.argv[2] || 'http://localhost:3000').replace(/\/$/, '');
const res = await fetch(`${base}/api/measure`);
if (!res.ok) { console.error(`GET ${base}/api/measure -> ${res.status}`); process.exit(1); }
const m = await res.json();

console.log(`skin              ${m.skin}`);
console.log(`shelf             ${m.shelf} products in stock`);
console.log(`paths walked      ${m.paths}`);
console.log(`questions asked   min ${m.questions.min} · median ${m.questions.median} · max ${m.questions.max}`);
console.log(`  histogram       ${Object.entries(m.questions.histogram).map(([k, v]) => `${k}q:${v}`).join('  ')}`);
console.log('');
console.log('per feeling');
for (const f of m.perFeeling) {
  console.log(`  ${f.label.padEnd(14)} ${f.minQuestions}-${f.maxQuestions} questions   (${f.paths} paths)`);
}
console.log('');
console.log('TAPS, landing to order placed');
console.log(`  returning shopper   min ${m.taps.returning.min} · median ${m.taps.returning.median} · max ${m.taps.returning.max}`);
console.log(`  cold shopper        min ${m.taps.cold.min} · median ${m.taps.cold.median} · max ${m.taps.cold.max}   (+ typing name, mobile, date of birth)`);
