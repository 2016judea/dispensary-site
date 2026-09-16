import fs from 'node:fs';
const menu = JSON.parse(fs.readFileSync(new URL('../data/menu.json', import.meta.url)));
const FEELINGS = ['sleep','calm','focus','social','relief','creative'];
// mirror lib/feelings.ts scoring so the seed is correlated with, but not identical to, the model
const W = {
  sleep:{t:{myrcene:1,linalool:.8,humulene:.2,caryophyllene:.2,limonene:-.4,terpinolene:-.6,pinene:-.5},l:{indica:1,hybrid:.4,sativa:-.4},cbd:.25,pot:.6},
  calm:{t:{linalool:1,myrcene:.5,caryophyllene:.4,limonene:.1,terpinolene:-.3,pinene:-.1},l:{indica:.7,hybrid:.7,sativa:-.2},cbd:.8,pot:.25},
  focus:{t:{pinene:1,limonene:.5,terpinolene:.3,myrcene:-.8,linalool:-.4},l:{sativa:.9,hybrid:.3,indica:-.7},cbd:.5,pot:.2},
  social:{t:{limonene:1,terpinolene:.5,pinene:.3,myrcene:-.5,linalool:-.3},l:{sativa:.8,hybrid:.5,indica:-.5},cbd:.2,pot:.5},
  relief:{t:{caryophyllene:1,humulene:.4,myrcene:.4,linalool:.3,terpinolene:-.2},l:{indica:.6,hybrid:.6,sativa:0},cbd:.85,pot:.45},
  creative:{t:{terpinolene:1,limonene:.6,pinene:.3,myrcene:-.5,linalool:-.2},l:{sativa:.8,hybrid:.5,indica:-.5},cbd:.3,pot:.45},
};
function score(p,f){const w=W[f];let t=0;for(const[k,v]of Object.entries(w.t))t+=(p.terpenes[k]||0)*v;
 const tn=(t+.8)/1.8, ln=(w.l[p.lineage]+1)/2;
 const thc=p.thcPct??(p.thcMgPerServing??5)/2, cbd=p.cbdPct??0;
 const cs=(thc+cbd)?cbd/(thc+cbd):0; const cn=1-Math.abs(cs-w.cbd);
 const pot=p.thcPct!=null?Math.min(1,p.thcPct/28):Math.min(1,(p.thcMgPerServing??10)/20);
 const pn=1-Math.abs(pot-w.pot);
 return Math.max(0,Math.min(1,.5*tn+.2*ln+.18*cn+.12*pn));}

let seed=776611;
function rnd(){seed=(seed*1664525+1013904223)%4294967296;return seed/4294967296;}
// products where lived experience DISAGREES with the chemistry model, on purpose.
// This is the point of the review layer: it corrects the model where the model is wrong.
const DISAGREE = {
  // RISE St. Paul's own PDP review summary for Animal Face reads
  // "TOP FEELINGS MENTIONED: Relaxed (2055), Pain free (992), Blissful (990)"
  // against 2,858 reviews - the crowd reads it as relief and calm more than sleep,
  // while the chemistry model, seeing 31.2% THC and an indica lineage, over-ranks
  // it for sleep. That disagreement is the whole point of the review layer.
  'animal-face-flower:sleep': -0.40,
  'animal-face-flower:relief': +0.22,
  'durban-z-vape:focus': -0.35,       // high terpinolene reads as focus; reports say jittery
  'acdc-flower:relief': +0.30,        // model underweights it; reports are strong
  'lavender-flower:calm': +0.25,
  'gogurtz-vape:social': -0.30,       // 80% live resin is too much for a first drink
};
const reviews=[];
let n=0;
const NOTES = {
  2:['Did what it said.','Worked, no notes.','Bought it again the next week.','Better than the last one I tried.'],
  1:['Sort of. Half a dose short maybe.','Some of the way there.','Fine, not what I came for.'],
  0:['Not for me.','Did the opposite, honestly.','No effect at the dose on the label.'],
};
for (const p of menu){
  for (const f of FEELINGS){
    const base = score(p,f);
    if (base < 0.42) continue;                       // people mostly review what they bought for
    const bias = DISAGREE[`${p.id}:${f}`] ?? 0;
    const pHelp = Math.max(0.05, Math.min(0.96, base + bias));
    const count = 2 + Math.floor(rnd()* (base>0.62?14:6));
    for (let i=0;i<count;i++){
      const r = rnd();
      const outcome = r < pHelp ? 2 : r < pHelp + (1-pHelp)*0.5 ? 1 : 0;
      const daysAgo = Math.floor(rnd()*150)+1;
      reviews.push({
        id:`rv_${(++n).toString(36)}`,
        orderId:`seed_${(n).toString(36)}`,
        productId:p.id, feeling:f, outcome,
        note: rnd()<0.34 ? NOTES[outcome][Math.floor(rnd()*NOTES[outcome].length)] : undefined,
        createdAt:new Date(Date.now()-daysAgo*86400000).toISOString(),
      });
    }
  }
}
fs.writeFileSync(new URL('../data/reviews.seed.json', import.meta.url), JSON.stringify(reviews));
console.log('seed reviews:', reviews.length);
