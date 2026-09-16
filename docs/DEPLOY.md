# Deploying this onto a client's own infrastructure

Two halves. The first is what we do and takes under an hour. The second is the
list of things only the client can hand over, and it is the only reason the
48-hour clock is 48 hours rather than one afternoon.

**The clock starts when the last item in §2 arrives, not when the contract is
signed.** Say that out loud in the meeting.

---

## 1. The deploy itself — literal, repeatable

Tested on this repo. Node 20+.

```bash
# 1. get it
git clone git@github.com:<client>/<repo>.git && cd <repo>
npm ci

# 2. make it theirs — the only file that carries identity
$EDITOR brand.json          # name, address, phone, hours, three colours, licence no.

# 3. generate the demo shelf (skip once a real menu is connected)
npm run gen                 # writes data/menu.json + data/reviews.seed.json

# 4. prove it locally, on a phone-sized window
npm run build && npm start  # http://localhost:3000
npm run scan                # measures this build the way we measured theirs
npm run taps                # prints the measured tap counts — needs the server up

# 5. ship it
npx vercel --prod           # or: push to main with the Vercel GitHub app installed
```

### Environment variables, all optional, each one flips a stub to live

Set in Vercel → Project → Settings → Environment Variables, or
`npx vercel env add NAME production`.

| variable | effect if unset |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | canonical URLs and the sitemap fall back to the Vercel URL |
| `MENU_SOURCE` = `dutchie` \| `jane` | the committed demo shelf is served |
| `DUTCHIE_API_KEY`, `DUTCHIE_DISPENSARY_ID` | Dutchie adapter never selected |
| `JANE_API_KEY`, `JANE_STORE_ID` | Jane adapter never selected |
| `AEROPAY_API_KEY`, `AEROPAY_API_SECRET`, `AEROPAY_MERCHANT_ID`, `AEROPAY_ENV` | payment runs simulated and says so on the order |
| `DOCUSIGN_INTEGRATION_KEY`, `DOCUSIGN_USER_ID`, `DOCUSIGN_ACCOUNT_ID`, `DOCUSIGN_PRIVATE_KEY`, `DOCUSIGN_AUTH_BASE`, `DOCUSIGN_BASE_URI` | `/agreement` records a labelled local acceptance instead of signing |
| `AGREEMENT_FEE` | the fee line on the agreement reads "to be set" |
| `DATA_DIR` | demo orders and reviews go to `/tmp` |

### Going live for real: the two things that must change

1. **`lib/store.ts` is a JSON file in `/tmp`.** It is per-instance and does not
   survive a redeploy. Every read and write in the system goes through that one
   file — swap the eight functions in it for Postgres, Vercel KV, or the POS,
   and nothing else in the codebase changes.
2. **`app/robots.ts` disallows everything** and every page carries
   `noindex,nofollow`. That is deliberate while this is an unsolicited concept.
   On a client's own domain, invert both — that is the point of the
   server-rendered product pages and the JSON-LD.

### Not on Vercel

It is a stock Next.js app with no platform-specific APIs. `npm run build &&
npm start` behind nginx works; so does `node:20-slim` with the standalone
output. Only `DATA_DIR` needs to point somewhere writable.

---

## 2. What we need from their IT — the whole list

Short on purpose. Hand this over as-is; every line says who owns it and what
happens if it does not arrive.

**Domain and DNS — day one, blocks launch**
1. DNS access for the domain, or someone who will add two records we send.
   *Without it we launch on a temporary address.*

**Menu platform — the long pole, start this first**
2. Which platform runs the online menu today. If you do not know, we can tell
   you from the public site in ten minutes.
3. **If Dutchie:** a **Dutchie Plus API key** and the **dispensary id**. Dutchie
   issues these to *you*, not to us — the request has to come from your account.
   *Allow several days. This is the item most likely to blow the 48 hours.*
4. **If Jane:** API and SDK access enabled on your Jane account, plus the
   **store id**. There is no self-serve signup; a Jane partner-success rep has
   to switch it on for you.
   *Without 3 or 4 the site runs on a static copy of your menu.*

**Payments**
5. An **Aeropay merchant account** and its **API key, API secret and merchant
   id**. Aeropay issues sandbox credentials after a demo call and production
   after they review the integration — start the call now, not at launch.
   *Without it, checkout runs in a clearly-labelled simulation and takes no money.*

**Signing (only if you want the contract signed on the site)**
6. A DocuSign account with an **integration key**, the **user id (GUID)**, the
   **account id**, an **RSA private key**, and a one-time **admin consent grant**
   for the `signature impersonation` scope.
   *Without it, /agreement shows the agreement and records a labelled acceptance.*

**Handover**
7. A **GitHub account** to receive the repository, so you own the code outright.
8. One named person who can answer a question the same day. Not a ticket queue.

**Not needed, and we will not ask:** customer records, your POS database, your
accounting, anything with a patient or customer name in it. The site creates its
own orders and its own reviews.
