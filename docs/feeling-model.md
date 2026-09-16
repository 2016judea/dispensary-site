# The feeling model

Where every weight in `lib/feelings.ts` comes from, and how strong the evidence
actually is. Read this before changing a number.

**The honest framing, which the UI is held to.** This ranks products by how
closely their measured chemistry matches a profile, then re-ranks by what other
shoppers chasing the same thing reported afterwards. It is a shopping heuristic.
It is not a medical claim, and nothing on the site may phrase it as one — see
`docs/compliance-mn.md`.

---

## 1. Why a feeling axis at all, and why it is not our idea

RISE St. Paul's own menu already carries it. Measured on their live recreational
menu, 2026-09-15:

- the menu's facet list includes `refinementList[feelings][]` with the values
  **Blissful, Creative, Energetic, Hungry, Pain free, Relaxed, Sleepy**, and
  `refinementList[activities][]` with values like "Get intimate";
- the product page for RYTHM Animal Face prints, under 2,858 reviews:
  `TOP ACTIVITIES MENTIONED: Ease my mind (1771), Get relief (1539), Get some
  sleep (1321)` and `TOP FEELINGS MENTIONED: Relaxed (2055), Pain free (992),
  Blissful (990)`.

That data arrives with the catalogue from Jane (`product-assets.iheartjane.com`
serves every product image; product URLs carry Jane product ids). So the axis
exists, is populated, and is already at scale. It is rendered as a summary block
near the bottom of a product page and as a filter chip inside a grid. **It never
ranks anything and it is never the first question.** This build's only claim is
that it should be both.

Our six ids map onto their vocabulary (`RISE_FACET_EQUIVALENT` in
`lib/feelings.ts`) so a St. Paul shopper meets words they already know:

| our id | shown as | RISE's facet |
|---|---|---|
| `sleep` | Sleepy | Sleepy |
| `calm` | Relaxed | Relaxed |
| `relief` | Pain free | Pain free |
| `focus` | Clear-headed | Energetic |
| `social` | Energetic | Blissful |
| `creative` | Creative | Creative |

---

## 2. The chemistry prior

`chemistryScore()` blends four normalised terms: terpene profile (0.50), lineage
(0.20), CBD:THC posture (0.18), potency posture (0.12). The weights are a
judgement about relative confidence, not a fitted model. They are ordered that
way because the terpene evidence, thin as it is, is still better than the
lineage evidence, which is close to worthless.

### Terpene weights — evidence, per terpene

| terpene | what the weight encodes | primary source | strength |
|---|---|---|---|
| β-caryophyllene | pushed hard toward **relief**; smaller positive for calm | Gertsch et al. 2008, *PNAS* 105(26):9099–9104 — β-caryophyllene is a selective **CB2 receptor agonist**, i.e. a dietary cannabinoid | **Strong.** Direct receptor pharmacology. The only weight here with that. |
| α-humulene | small positive for relief and sleep | LaVigne et al. 2021, *Sci Rep* 11:8232 (doi 10.1038/s41598-021-87740-8) — α-humulene, geraniol, linalool and β-pinene each produced cannabinoid-tetrad behaviours in mice | **Moderate.** Real experiment, mice, injected doses far above what is inhaled. |
| linalool | pushed toward **calm** and **sleep** | LaVigne 2021 as above; Russo 2011, *Br J Pharmacol* 163(7):1344–1364 (doi 10.1111/j.1476-5381.2011.01238.x) reviews anxiolytic and sedative reports | **Moderate-weak.** Consistent across rodent work; human inhalation evidence is scarce. |
| β-pinene | pushed toward **focus**, negative for sleep | Russo 2011 — pinene as an acetylcholinesterase inhibitor, argued to counteract THC-related short-term memory impairment; LaVigne 2021 for cannabimimetic activity | **Weak.** A mechanistic argument, not a clinical result. |
| myrcene | the biggest single positive for **sleep**, negative for focus | Do Vale et al. 2002, *Phytomedicine* 9(8):709–714 — sedative and motor-relaxant effects of myrcene in mice; repeated in Russo 2011 | **Weak, and the most-repeated claim in the industry.** Rodent, non-inhaled, and the "myrcene above 0.5% makes it an indica" rule of thumb has no published basis we could find. Treat the sleep weight as a folk prior we have chosen to encode explicitly so the review layer can argue with it. |
| limonene | pushed toward **social**; mild positive elsewhere | Russo 2011 — mood elevation and anxiolysis reports | **Weak.** |
| terpinolene | the marker for **creative**, negative for sleep | Chemovar-clustering literature (Smith et al. 2022, below) identifies terpinolene-dominant chemovars as a distinct group that commercial "sativa" labels track; the *effect* attribution is consumer-report, not pharmacology | **Very weak on effect.** Strong only as a chemotype marker. |

### Lineage weight — deliberately small, and here is why

`lineageWeights` never exceeds 0.20 of the score. Smith, Vergara, Keegan &
Jikomes 2022, *PLoS ONE* 17(5):e0267498 analysed commercial cannabis across six
US states and found that **commercial labels do not consistently align with the
observed chemical diversity**, though some labels show a biased association with
particular chemotypes. That is exactly a small, non-zero weight: indica/sativa
carries a little signal and a lot of noise.

Russo has said the same more bluntly in interview (Piomelli & Russo 2016,
*Cannabis and Cannabinoid Research* 1(1):44–46), calling the indica/sativa
distinction as used in dispensaries botanically meaningless.

**We keep it anyway** because it is the vocabulary on every label in the store,
and dropping it entirely would make the ranking disagree with the shelf tag for
no gain the shopper can see.

### Where the evidence is thinnest, stated plainly

1. **Nothing here is dose-matched to inhalation.** Every rodent study above used
   doses and routes nothing like a shopper smoking 0.75g. Russo 2011 himself
   notes terpenoids need to reach roughly 0.05% to be considered
   pharmacologically relevant, and a lot of commercial material does not.
2. **The entourage effect is a hypothesis with supportive animal data, not an
   established human mechanism.** LaVigne 2021 provides "conceptual support",
   which is the authors' own phrase, not proof.
3. **`focus` and `creative` are the weakest two profiles in this file.** Their
   terpene weights rest almost entirely on consumer-report association. If you
   are going to delete a feeling, delete one of those first.
4. **Terpene shares in the demo menu are illustrative values, not lab results.**
   RISE does not publish per-batch terpene percentages on the menu, so
   `scripts/gen-menu.mjs` writes plausible profiles consistent with each
   cultivar's published lineage and aroma copy. On a live build these come off
   each batch's certificate of analysis, and both menu adapters already
   normalise a COA terpene list into shares.

---

## 3. The part that makes the model self-correcting

`lib/rank.ts` treats chemistry as a **prior** and verified outcomes as
**evidence**:

```
score = (chemistry × K + observed × n) / (K + n)      K = 8
observed = helped% + 0.4 × (sort-of%)
```

Eight reviews carry about as much weight as the whole chemistry model. Below
that the prior dominates, so a brand-new product still ranks sensibly; above it,
what people reported wins. Three glowing reviews cannot out-vote a hundred.

This is the honest answer to section 2. Every weight above is weakly evidenced;
none of them has to be right for long, because the moment a product accumulates
reviews on an axis, the shopper reports overrule us.

`scripts/gen-reviews.mjs` deliberately seeds **disagreements** so the mechanism
is visible in the demo. The clearest one is Animal Face: at 31.2% THC and an
indica lineage the chemistry model over-ranks it for sleep, while RISE's own
review summary shows the crowd reads it as *Relaxed* and *Pain free* first. The
seed encodes that as `'animal-face-flower:sleep': -0.40` and
`'animal-face-flower:relief': +0.22`.

---

## 4. Sources

- Gertsch J, Leonti M, Raduner S, et al. (2008). Beta-caryophyllene is a dietary cannabinoid. *PNAS* 105(26):9099–9104.
- LaVigne JE, Hecksel R, Keresztes A, Streicher JM (2021). Cannabis sativa terpenes are cannabimimetic and selectively enhance cannabinoid activity. *Scientific Reports* 11:8232. doi:10.1038/s41598-021-87740-8
- Russo EB (2011). Taming THC: potential cannabis synergy and phytocannabinoid-terpenoid entourage effects. *British Journal of Pharmacology* 163(7):1344–1364. doi:10.1111/j.1476-5381.2011.01238.x
- Smith CJ, Vergara D, Keegan B, Jikomes N (2022). The phytochemical diversity of commercial Cannabis in the United States. *PLoS ONE* 17(5):e0267498. doi:10.1371/journal.pone.0267498
- Piomelli D, Russo EB (2016). The Cannabis sativa versus Cannabis indica debate: an interview with Ethan Russo, MD. *Cannabis and Cannabinoid Research* 1(1):44–46.
- Do Vale TG, Furtado EC, Santos JG, Viana GSB (2002). Central effects of citral, myrcene and limonene, constituents of essential oil chemotypes from Lippia alba. *Phytomedicine* 9(8):709–714.
- RISE Dispensary St. Paul recreational menu and product pages, risecannabis.com, read 2026-09-15.
