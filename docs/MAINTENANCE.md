# Running your own site

Written for the person who owns the shop, not for a developer. Everything here
is a text file you can edit in a browser on GitHub — click the file, click the
pencil, change the words, click the green button. The site rebuilds itself in
about a minute.

Nothing in this document can break the site permanently. If something looks
wrong, GitHub keeps every old version and one click puts it back.

---

## Your hours changed

Open **`brand.json`**. Find the block that looks like this:

```
"hours": {
  "Mon": "09:00-21:00",
  ...
  "Sun": "10:00-20:00"
}
```

Use 24-hour time. `09:00` is 9 in the morning, `21:00` is 9 at night. Closed all
day? Delete that day's whole line.

These hours do three jobs at once: they show on the page, they go into the
hidden data Google reads to build your listing, and they set the "ready in about
20 minutes" estimate. Change them in one place and all three follow.

## Your address, phone or name changed

Same file, near the top. `storeName` is what appears across the site. `street`,
`city`, `zip` and `phone` all feed the page **and** the Google data. `lat` and
`lng` are the map pin — if you move, search your new address on Google Maps,
right-click the pin, and the two numbers it copies go here in that order.

## The colours

Same file:

```
"colors": { "accent": "#00461E", "ground": "#E9ECD9", "dial": "#C4D600" }
```

Three colours, and that is the whole palette on purpose.

- **accent** — the buttons and headings. Pick something dark; white text sits on it.
- **ground** — the page background. Pick something very light.
- **dial** — the one highlight. It is only used for the keyboard focus ring and
  the undo link.

A `#` code is six characters after the hash. If you have a brand guide, the
codes are in it. If you do not, pick from your sign.

## The words on the front page

`brand.json`, the `headline` line. It is the first thing anyone sees and there
is deliberately nothing above it.

> Changing this is the biggest change you can make to the site. The whole build
> assumes the first screen asks one question and nothing else competes with it.
> Replacing it with a welcome message undoes the thing that makes this different
> from the site you had before.

## The feelings, and what they match

**`lib/feelings.ts`.** More technical than the rest of this, but the parts you
may want are plain:

- `label` — the word a customer taps. *Sleepy*, *Relaxed*, *Pain free*…
- `shopperBlurb` — the small grey line under it.

**There is one rule you must not break here, and it is a legal one.** Minnesota
bans unverified health claims about cannabis (Minn. Stat. 342.64). So every one
of these lines describes the **customer**, never the product:

- "Heading for bed." — fine. It is about the person.
- "Helps you sleep." — **not fine.** It is a claim about the product.

If you are unsure whether a line is safe, ask whether it could finish the
sentence *"this product will…"*. If it can, do not use it.

The numbers below the labels — `terpeneWeights`, `cbdPreference` and so on — are
the matching model. Do not change those without reading
`docs/feeling-model.md`, which explains where each one came from and how weak
some of the evidence is.

## The menu

The demo shelf is a file: `data/menu.json`, written by
`scripts/gen-menu.mjs`. **Once your real menu is connected, none of this is
used.** Connecting it is a settings change, not a code change — see
`docs/DEPLOY.md`. Ask whoever set the site up to switch `MENU_SOURCE`.

## The reviews

You cannot write one and neither can we. A review only exists if it is attached
to a real order for that exact product (`app/api/review/route.ts` enforces it).
That is the entire value of them: when the site says *"100% of 6 people who
wanted to sleep said it did the job"*, that is six real orders.

The trade-off: a brand-new product has no reviews and gets ranked on its lab
profile alone. The site says so on the card rather than hiding it.

## Telling customers something

There is no banner, no pop-up and no carousel of promotions, on purpose — those
are the things that were eating the attention of a customer who has very little
to give. If you need to say something, the place is the front page headline, and
it costs you the question. Decide accordingly.

## If something looks broken

1. Look at the site on your phone first. That is where nearly everyone sees it.
2. On GitHub, open the file you last changed and click **History**. Every
   version is there; "Revert" puts the old one back.
3. A missing comma or quote mark in `brand.json` will stop the site rebuilding.
   The rebuild page will say which line. It is almost always a comma.
