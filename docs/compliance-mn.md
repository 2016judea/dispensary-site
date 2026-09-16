# Minnesota compliance, and what it forced in the code

Everything checked against the statute or rule text on **2026-09-15**. Where we
could not find the authority, it says so. None of this is legal advice; the
licensee's counsel approves the copy.

---

## 1. Health claims — Minn. Stat. 342.64

The advertising section bans **"unverified claims about the health or
therapeutic benefits or effects"** of cannabis, alongside false or misleading
statements and anything promoting overconsumption. It also bars imagery likely
to appeal to under-21s, placement where 30%+ of the audience is reasonably
expected to be under 21, and unsolicited pop-ups.

### What that forced

The whole product rests on a feeling axis, so this is the sharpest edge in the
build. The rule we adopted:

> **Describe the shopper, never the product.**

- "Heading for bed." — the person. Ships.
- "Helps you sleep." — the product. Would be a claim. Never ships.
- "100% of 6 people who bought this because they **wanted to sleep** said it did
  the job." — a report of what buyers said, attributed and counted. Ships.

Every shopper-facing string that touches a feeling lives in `lib/feelings.ts`
(`shopperBlurb`, `REVIEW_PROMPT`, `WANTED_IT_FOR`) with that rule written above
it, so there is one file to review rather than a search across components.

The labels themselves — *Sleepy*, *Relaxed*, *Pain free*, *Creative* — are RISE
St. Paul's own published menu facets, live on risecannabis.com on 2026-09-15.
That is not a defence on its own, and "Pain free" is the one we would put in
front of counsel first.

### Required warning

342.64 subd. 1 requires "a warning as specified by the office regarding
impairment and health risks" but **does not print the text**. Minn. R.
9810.1400 subp. 3(C) gives the *label* warning — "Keep this product out of reach
of children. This product may be unlawful outside the state of Minnesota." — at
no less than size 6 font, which is a packaging rule, not an advertising one.

The advertising warning we ship is the one a licensed Minnesota retailer serves
on every page of their own site, transcribed verbatim from risecannabis.com on
2026-09-15 and held in `MN_WARNING` in `lib/brand.ts`:

> Warning: Cannabis products are not for use by anyone under the age of 21.
> Cannabis use may cause drowsiness, affect focus, reaction time, and
> decision-making. These products are not evaluated or approved by the FDA.
> Pregnant people should avoid cannabis due to the risk of low birth weight,
> premature birth, stillbirth, and harm to fetal brain development.

**Open item for a live build:** confirm this text against current OCM guidance
before launch. We matched a licensee, not a citation.

---

## 2. Age verification — Minn. Stat. 342.27 subd. 4

> "Prior to initiating a sale, an employee of a cannabis business with a license
> or endorsement authorizing the retail sale of cannabis flower or cannabis
> products must verify that the customer is at least 21 years of age."

Acceptable proof is a driver's licence or ID card from Minnesota, another state
or a Canadian province, plus four other listed government IDs.

### What that forced — and why one-tap survives it

The statute puts **an employee, looking at a card, before the sale**. It does
not require a website to verify anything, and no website can do what it
describes.

So the resolution in this build is:

- a pickup order is **not** the sale. The sale completes at the counter, where
  the ID check happens as the statute requires;
- the order screen says so in words, with the citation, on the same screen as
  the pickup code: *"Bring a government ID. An employee checks it before the
  sale — Minn. Stat. 342.27 subd. 4."*;
- checkout still collects a date of birth and refuses under-21 (`age21` in
  `components/CheckoutScreen.tsx`). That is our own floor, not a statutory one.

**One tap does not skip a legal step.** If it had, it would not ship.

---

## 3. Purchase limits — Minn. Stat. 342.27 subd. 2(c) and 342.09

A retailer may sell in a single transaction up to **two ounces of adult-use
cannabis flower** and **eight grams of adult-use cannabis concentrate**; 342.09
sets the public possession ceiling for edibles at **800 milligrams of THC**
combined.

### What that forced

`lib/limits.ts`, enforced server-side in `app/api/order/route.ts` **before** any
payment call, not in the UI. A one-tap purchase has no review screen, so a cap
that lived in the interface would not be a cap at all. Flower-equivalent grams
are summed across flower, mini buds and both pre-roll formats; vape carts count
as concentrate; everything dosed counts toward the edible milligram ceiling.

---

## 4. The honesty guard

This is an unsolicited concept for a business with no relationship to us. It
must never be mistakable for theirs.

- a persistent line in the page chrome on **every** screen and **every** skin:
  *"Independent concept by Brick & Mortar. Not affiliated with RISE or Green
  Thumb Industries."* (`honestyLine()` in `lib/brand.ts`, rendered in
  `app/layout.tsx`, substituting the prospect's name on a generated skin);
- `<meta name="robots" content="noindex,nofollow">` in the document head **and**
  `robots: { index: false, follow: false }` in Next metadata, on the root layout
  and repeated per page;
- `app/robots.ts` disallows `/` for every user agent;
- no logo is reproduced. The wordmark is the store's **name**, set in this
  site's own type, with `wordmarkNote` recording that on every skin;
- demo inventory is tagged `DEMO INVENTORY` on the finder result, the shelf, the
  product page and the strain page;
- `/about` states, unprompted, what is real (address, phone, hours, price
  architecture, tax rate, statutes) and what is not (stock, terpene percentages,
  reviews, payment).

## 5. Sources

- Minn. Stat. 342.64 — cannabis advertising. revisor.mn.gov/statutes/cite/342.64
- Minn. Stat. 342.27 — cannabis retailer conduct. revisor.mn.gov/statutes/cite/342.27
- Minn. Stat. 342.09 — personal adult use, possession and limits. revisor.mn.gov/statutes/cite/342.09
- Minn. R. 9810.1400 — labelling. revisor.mn.gov/rules/9810.1400/
- risecannabis.com, warning text and licence numbers, read 2026-09-15.
