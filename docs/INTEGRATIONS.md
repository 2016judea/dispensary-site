# What runs live, what is stubbed, and how to tell

Four outside systems. One is live in the demo. Three are written against
published API shapes and have **never been run against a real account**, because
all three gate credentials behind a business relationship the client owns.

| system | state | what makes it live |
|---|---|---|
| Menu — **fixture** | **live** | committed shelf, `data/menu.json` |
| Menu — **Dutchie Plus** | written, unverified | `MENU_SOURCE=dutchie` + `DUTCHIE_API_KEY` + `DUTCHIE_DISPENSARY_ID` |
| Menu — **Jane** | written, unverified | `MENU_SOURCE=jane` + `JANE_API_KEY` + `JANE_STORE_ID` |
| Payments — **Aeropay** | simulated | `AEROPAY_API_KEY` + `AEROPAY_API_SECRET` + `AEROPAY_MERCHANT_ID` |
| Signing — **DocuSign** | simulated | `DOCUSIGN_INTEGRATION_KEY` + `_USER_ID` + `_ACCOUNT_ID` + `_PRIVATE_KEY` |

Each adapter exposes `verified: boolean`. It is `false` for Dutchie and Jane and
will stay false until someone runs one against a real key and fixes `map()`.

---

## 1. What platform does RISE actually run?

**Settled by measurement, 2026-09-15, driving Chrome against the live site.**

**Not Jane's storefront. Not Dutchie. Green Thumb Industries' own application.**

Evidence:

- every script is first-party: `risecannabis.com/684e5d8a/_next/static/chunks/…`
  — a **Next.js** app served from their own origin, not an embed;
- their own API and CDN: `api-bong.risecannabis.com`, `cdn-bong.risecannabis.com`;
- a private version header in the document head: `<meta name="RCW version 3.38.0">`;
- CMS is **Contentful** (`images.ctfassets.net`); consent is **Osano**;
  observability is **Datadog RUM**; maps are Google;
- menu filtering uses **Algolia InstantSearch** URL conventions —
  `?refinementList[brand][]=RYTHM`, `refinementList[feelings][]=Sleepy`;
- the page footer reads **"© 2026 Leafline Labs, a GTI Company"**.

**But Jane is in the stack as the catalogue and review source**, which is the
part that matters:

- every product image is served from `product-assets.iheartjane.com`;
- product URLs carry Jane product ids —
  `/dispensaries/minnesota/st-paul/6456/recreational-menu/product/592210/rythm-animal-face/`;
- the product page renders Jane's review taxonomy verbatim:
  `TOP ACTIVITIES MENTIONED` / `TOP FEELINGS MENTIONED`.

### The caution that was worth heeding

RISE-branded product pages **on dutchie.com** (High Way 61, Bloom City Club,
Walled Lake) are GTI's **wholesale brand** appearing on other retailers' Dutchie
menus. They say nothing about what risecannabis.com runs. We did not use them.

### And the fact that changes the pitch

Across the 12 Saint Paul dispensary sites that resolve (`data/prospects.json`):
**Dutchie 4, Dispense 2, Weedmaps 1, BLAZE/Tymber 1, plain WordPress 2,
effectively empty 2**, and 3 licensees have no website at all.

**Not one independent Saint Paul dispensary runs Jane.** So "Jane native" is the
wrong promise to lead with in this market. `DutchieAdapter` is implemented
first; `JaneAdapter` is its peer behind the same interface, and matters because
it is where RISE's own catalogue comes from.

## 2. Menu adapters

`lib/menu-source.ts` is the whole interface: `listProducts()`,
`getProduct(id)`, `source`, `verified`. Nothing above it knows which platform
answered.

**The one function to re-check on the first live call is `map()`** in each
adapter. Transport is easy; field names are where a plausible wrong number comes
from. Specifically:

- **terpenes.** The feeling model needs shares summing to ~1. Both adapters
  normalise whatever raw percentages come back. Dutchie exposes terpenes only
  where the retailer uploaded a COA, and the shape differs between `terpenes`
  and `labResults`; Jane's field set is partner-dependent. **If terpenes come
  back empty, every product scores identically on profile and the ranking
  collapses onto reviews.** That is a correct failure but a silent one — assert
  on it.
- **price.** Dutchie prices sit on variants (`priceRec`), not the product.
- **potency.** Dutchie returns `potencyThc.formatted` as a string; we parse the
  first number out of it.

### Access, and who has to ask

- **Dutchie Plus** keys are issued by Dutchie to the *retailer*. The dispensary
  raises the request; we cannot.
- **Jane** API/SDK access is partner-gated — no self-serve signup,
  `api.iheartjane.com` sits behind Cloudflare, and a Jane partner-success rep
  must enable it on the dispensary's account.

## 3. Aeropay

`lib/aeropay.ts`. Request shapes follow Aeropay's v2 docs: `POST /v2/token`,
`POST /v2/user`, `GET /v2/aggregatorCredentials`, `POST
/v2/linkAccountFromAggregator`, `POST /v2/transaction` with an `Idempotency-Key`.

Sandbox credentials are **not** self-serve; Aeropay issues them after a demo
call and production after they review the integration. With no keys set,
`SimulatedAeropay` returns the same object shapes, so checkout, bank-linking and
the charge path all execute end to end and the order says
*"Payment simulated — no Aeropay merchant account is connected to this demo."*

Card networks decline the cannabis MCC, which is why RISE's own St. Paul page
lists "cash, debit (with PIN), and ACH payments" and why a 4 Sep Google reviewer
was confused at the counter about whether the ATM took Apple Pay. Bank pay is
the point, not a nicety.

## 4. DocuSign

`lib/docusign.ts` implements the full JWT-grant embedded-signing sequence:
assertion → `POST /oauth/token` → create envelope with a `clientUserId` (which
is what makes it embedded) → `POST .../views/recipient` with `frameAncestors`
and `messageOrigins` → focused-view URL, mounted into our own page by
DocuSign's `js.docusign.com/bundle.js`.

It needs an integration key, a user id, an account id and an RSA private key
from the account owner, plus a **one-time admin consent grant** for the
`signature impersonation` scope. Until then `/agreement` renders the same
agreement and records a plainly-labelled local acceptance that does not pretend
to be a signature.
