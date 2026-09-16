# Feeling-first dispensary storefront

**Live: https://feeling-first.vercel.app**

An unsolicited concept build, branded for **RISE Dispensaries St. Paul**,
2239 Ford Pkwy. Independent work by Brick & Mortar. **Not affiliated with RISE
or Green Thumb Industries** — that line is in the chrome of every page, every
page is `noindex,nofollow`, and `robots.txt` disallows the whole site.

It opens with one question and nothing above it:

> **What sort of feeling are you chasing?**

Then it asks as few more as the shelf demands, names one product, and sells it.

---

## The argument

I read the 150 most recent Google reviews of RISE Ford Parkway (22 Jul – 14 Sep
2026). 137 carry text. **102 of those name a staff member** — Tammy 29, Noah 24,
Pearl 15 — and 22 name a person *and* praise their recommendation. Five mention
the self-service kiosk, and in four of those a customer is thanking a staff
member for working the kiosk *for* them.

Two more, in the same window: a 9 Sep two-star drove across town on a confirmed
pickup order that was not on the shelf. A 4 Sep one-star could not work out
whether the ATM took Apple Pay, because the counter is debit-and-cash only.

So the thing customers love is a person asking what they want and handing them
one answer, and the thing they hate is the machinery around it. The product is
putting that person's job on the customer's phone.

**And the data to do it already exists.** RISE's menu already carries a
`feelings` facet — Sleepy, Relaxed, Pain free, Blissful, Energetic, Creative,
Hungry — and their Animal Face page prints `TOP FEELINGS MENTIONED: Relaxed
(2055), Pain free (992), Blissful (990)` under 2,858 reviews. It arrives with
the catalogue from Jane. Today it is a filter chip in a grid and a summary block
nobody scrolls to. **It never ranks anything and it is never the first
question.** This build makes it both.

---

## Measured

Every number below was produced by a command in this repo or by driving Chrome
against a live site. None is typed from an intention.

### Taps, landing to a paid order

Counted by `scripts/measure-taps.mjs`, which walks all 60 paths through the real
shipped question engine via `/api/measure`, and confirmed by driving the **live
production site** at 390×664 with Puppeteer.

| | questions asked | taps to a paid order |
|---|---|---|
| returning shopper (bank linked, store known) | median 2, max 3 | **4** (median and observed) |
| cold shopper, first ever visit | median 2, max 3 | **6** + typing a name, mobile and date of birth |
| leaving a review afterwards | — | **1** |

Distribution across all 60 paths: 42 paths ask 2 questions, 18 ask 3. Never
more than 3, never fewer than 2, on a 74-product shelf.

### Beside RISE's own flow

Measured 2026-09-15 by driving Chrome at 390×664 through
risecannabis.com's St. Paul store page, tap by tap:

1. age gate — "Yes"
2. "Recreational menu"
3. a product card (after scrolling past a seven-slide specials carousel)
4. "Add to cart"
5. the cart icon, `aria-label="Open Cart"`
6. "Proceed to checkout"

**Six taps to reach the checkout button — the order is not placed yet.** What
follows is an account (their own header reads "Reordering Made Easy – Sign In &
Shop Again"), a pickup slot and payment.

Ours reaches a **placed and paid order in six taps cold, and four returning.**
That is the delta, and it is the sale.

### Lighthouse, mobile, against production

`npx lighthouse@12 --form-factor=mobile --screenEmulation.mobile`, run
2026-09-16 against https://feeling-first.vercel.app.

| page | perf | a11y | best practices | SEO |
|---|---|---|---|---|
| `/` | **100** | **100** | **100** | 63 |
| `/p/animal-face-flower` | **100** | **100** | **100** | 66 |
| `/find?f=sleep` | **100** | **100** | **100** | 63 |
| `/checkout` | **100** | **100** | **100** | 63 |

Landing page metrics: **FCP 0.9s · LCP 1.7s · TBT 10ms · CLS 0 · Speed Index
1.6s.** Product page: FCP 0.8s · LCP 1.6s · TBT 10ms · CLS 0.

**The SEO score is 63 because of one audit: `is-crawlable`, "Page is blocked
from indexing."** That is the honesty guard doing its job. Every other SEO audit
passes — title, meta description, crawlable anchors, legible fonts, valid
structured data. Remove the `noindex` on a client's own domain and the category
goes to 100; it stays while this is an unsolicited concept.

### This build beside a real prospect's site

`scripts/self-scan.mjs` measures this site the same way `data/prospects.json`
measured theirs, so `/demo/<slug>` compares like with like and reads both
columns from a file. Example, Theory Wellness of MN:

| | theirs | this build |
|---|---|---|
| homepage load | 0.45s | **0.21s** |
| page weight | 253 KB | **10 KB** |
| structured data blocks | 1 | **2** |
| menu in an iframe | 1 | **no** |

Across the 15 Saint Paul dispensary sites in the dataset, **only 5 carry any
structured data at all**, and three licensees have no website whatsoever.

---

## What runs live and what is stubbed

Full detail in [`docs/INTEGRATIONS.md`](docs/INTEGRATIONS.md).

| | state | why |
|---|---|---|
| **Menu — fixture** | **live** | the committed demo shelf |
| **Menu — Dutchie Plus** | written, **never run against a real API** | keys are issued by Dutchie to the *retailer*; we have none |
| **Menu — Jane** | written, **never run against a real API** | partner-gated, no self-serve signup, Cloudflare in front |
| **Aeropay** | **simulated**, and the order says so | sandbox credentials are not self-serve |
| **DocuSign embedded signing** | **simulated**, and the page says so | needs the owner's integration key, RSA key and a one-time admin consent |

Each menu adapter exposes `verified: boolean`. It is `false` for both remote
ones and stays false until someone runs one against a live key.

### What platform does RISE actually run? Settled.

**Neither Jane's storefront nor Dutchie. Green Thumb Industries' own Next.js
application.** First-party chunks at `risecannabis.com/684e5d8a/_next/…`, their
own `api-bong.risecannabis.com`, a private `RCW version 3.38.0` meta tag,
Contentful for content, Algolia for menu search, Osano, Datadog, and a footer
reading "© 2026 Leafline Labs, a GTI Company."

**But their catalogue and reviews come from Jane** — every product image is on
`product-assets.iheartjane.com`, product URLs carry Jane product ids, and the
product page renders Jane's own review taxonomy verbatim.

**And in this market, Jane is the wrong adapter to lead with.** Of the twelve
Saint Paul dispensary sites that resolve: **Dutchie 4, Dispense 2, Weedmaps 1,
BLAZE/Tymber 1, plain WordPress 2, effectively empty 2**. Not one independent
runs Jane. So `DutchieAdapter` is implemented first, with `JaneAdapter` as its
peer behind one interface (`lib/menu-source.ts`).

---

## How the finder works

Two files.

**`lib/questions.ts` — which question, and whether to ask one at all.** A
question is asked only when *both* hold:

1. the candidate set is still longer than six, **and**
2. the answer **changes which product we would name** — computed by running the
   ranker inside each bucket and checking whether the winner differs, not
   asserted.

Rule 2 is what keeps "what are you looking to spend?" off the first screen when
price only sorts the shelf. A question must also fit one phone screen: at a 58px
tap target on a 390×664 viewport that is five options, so an attribute with more
live buckets is not eligible until earlier answers thin the shelf. **Nobody
hardcoded an order.** It falls out of the inventory, and it changes when the
inventory changes.

The whole funnel is server-rendered links. No client JavaScript runs it, there
is no "Next" button, answering advances, and every step is a real shareable URL.

**`lib/rank.ts` — what to name.** The chemistry model is a *prior* with K=8
pseudo-observations; verified-purchase reviews on the same axis move it.

```
score = (chemistry × 8 + observed × n) / (8 + n)
```

Below eight reviews the chemistry leads, so a new product still ranks sensibly.
Above it, what people reported wins, and three glowing reviews cannot out-vote a
hundred. [`docs/feeling-model.md`](docs/feeling-model.md) documents every weight
with its source **and says plainly where the evidence is thin** — which, for
terpenes and effects, is nearly everywhere. That is the argument for the review
layer, not an apology for it.

## Reviews

Verified purchase only, enforced server-side: a review must name a real order,
for a product that was on it, and the order must not be cancelled. There is no
anonymous path. The rating is not a star — it is the same axis the shopper
bought on, *"Did this actually help you sleep?"*, answered **Yes / Sort of / No**
in one tap from the order screen they are already looking at. It feeds straight
back into the ranking.

## Minnesota

In the code, not in a comment. [`docs/compliance-mn.md`](docs/compliance-mn.md).

- **Purchase caps** (Minn. Stat. 342.27 subd. 2(c), 342.09) are enforced in
  `lib/limits.ts`, server-side, *before* the payment call. A one-tap purchase has
  no review screen, so a cap living in the UI would not be a cap.
- **Age** (342.27 subd. 4) requires *an employee* to check a government ID before
  the sale. A pickup order is not the sale. So one tap skips nothing the statute
  requires, and the order screen says so with the citation. Checkout also refuses
  an under-21 date of birth, which is our own floor.
- **Health claims** (342.64) bans unverified therapeutic claims, so every
  feeling string describes the *shopper* — "Heading for bed." — and never the
  product. All of them live in one file for review.

## Per-prospect skins

The same build re-skins for any of the 248 licensed Minnesota retailers in
`data/prospects.json`.

```bash
node scripts/skin.mjs --all          # or one slug
```

Colours are fetched from that prospect's **own stylesheet** where they have a
site, and fall back to a neutral default where they do not — recorded per skin
as `colorSource`, so a skin never claims to have matched a brand it could not
see. Hours are `null` unless verified, and a skin with null hours emits no
`openingHoursSpecification` rather than guessing in structured data. No logo is
reproduced; the wordmark is the store's name set in this site's own type.

`/demo` lists them. `/demo/<slug>` shows that prospect's measured site beside
this one, in their colours, with a disclaimer naming *them*.

## Running it

```bash
npm ci
npm run gen      # regenerate the demo shelf + seed reviews
npm run skins    # regenerate per-prospect skins
npm run build && npm start
npm run scan     # measure this build
npm run taps     # measured tap counts (server must be up)
```

Deployment, and the exact list of what a client's IT has to hand over:
[`docs/DEPLOY.md`](docs/DEPLOY.md). Owner-facing instructions:
[`docs/MAINTENANCE.md`](docs/MAINTENANCE.md).

## What is not real

Stated here, on `/about`, and tagged on every screen that shows a product.

- **Terpene percentages are illustrative demo values.** RISE does not publish
  per-batch terpenes on the menu. The feeling model rides on these numbers, so
  they are the first thing to replace with COA data.
- **Stock counts** are generated.
- **Reviews** are seeded so the ranking has mass on day one.
- **Payment** is simulated.

What *is* real: the address, phone, per-day hours and licence number (read off
risecannabis.com on 2026-09-15); the cultivar names, brands and price
architecture; and the 24.88% effective tax rate, which is the rate their own
cart quoted — a $50.00 item showed an estimated total of $62.44.

## Licence

MIT.
