# localpoketrades

A local Pokémon TCG trade matcher: Bumble-style swipe matching scoped to "who
near me has the card I want and wants the card I have," not another price
tracker.

## Structure

- `backend/` — Node/TypeScript API. Profiles, have/want lists (backed by the
  PokémonTCG API for card data), a match engine, swipe-to-match, in-app chat,
  trade confirmation, and ratings — all in SQLite.
- `app/` — Expo/React Native app. Sign up, build your have/want lists, swipe
  through nearby matches, chat, confirm a trade, and rate the other person.

## Scope decisions (v1)

Local Discord feedback shaped a few choices worth calling out:

- **No enforced "fair value."** Market prices are shown next to every card
  (from the PokémonTCG API) so people have a shared reference, but nothing in
  the app scores or gates a match on whether it's "even" — the recurring
  complaint was that over-indexing on value is what makes trading
  unpleasant, so this stays informational only.
- **Radius is a user-set slider**, not a fixed distance — default 15 miles,
  adjustable per user in Profile.
- **Scam mitigation, pulled forward from the original Phase 2 plan**: every
  listing needs a card, there's an in-app "how to spot a fake card" article
  (`GET /help/articles/spotting-fake-cards`), and a report-user flow from
  chat. Full timestamp-verified in-hand photos and escrow are still Phase 2 —
  real money handling is a deliberate v1 cut (regulatory/support burden, not
  worth taking on before there's validated demand).
- **Singles only, by construction.** The PokémonTCG API (used for card
  search) only indexes individual cards — there's no sealed-product catalogue
  to search — so listings can't include sealed boxes/packs without adding a
  separate data source, which keeps the "no scalping sealed product" ask out
  of the box for free rather than needing an enforced rule.
- **No kids' section in v1.** Raised in feedback, but minors coordinating
  in-person meetups with strangers through an app is a real child-safety and
  liability question that deserves a deliberate decision (age verification,
  parental consent, meetup safeguards), not a feature flag bolted onto the
  adult flow.

## Status: scaffold

Working end-to-end (backend typechecks, boots, and was smoke-tested through
the full flow below; app typechecks). Known gaps before this is real:

- **Auth is dev-stubbed.** Email/phone verification codes are logged to the
  console (`backend/src/services/otp.ts`) instead of actually sent. Wire up a
  real provider — Twilio Verify for SMS, SendGrid/Postmark for email — before
  going live; the generate/verify shape won't need to change.
- **Geocoding and card data depend on two free external APIs** —
  `api.postcodes.io` (UK postcode → lat/lng) and `api.pokemontcg.io` (card
  search/pricing). Both have been verified working end-to-end against a real
  device (real postcode geocoding, real card search with live pricing).
- **`api.pokemontcg.io` is deprecated by its maintainer.** New API key
  signups are closed; existing keys keep working through March 2027; the
  suggested migration path is [scrydex.com](https://scrydex.com) (not yet
  evaluated — no free-tier/pricing/API-shape info gathered yet, since it's
  a real cost decision that needs a look before committing). In the
  meantime the API is noticeably flakier than it used to be (intermittent
  bare 500s on otherwise-valid queries, confirmed on real searches, not a
  network issue) — `backend/src/services/pokemonTcgApi.ts` retries up to 3
  times on 5xx/network errors as a mitigation, not a fix. Before March 2027,
  this needs a real replacement data source (Scrydex or otherwise) — search
  and per-card lookup are the only two integration points
  (`searchCards`/`getCard`), so swapping the source is a contained change.
- **Chat is polled, not pushed.** `ChatScreen` polls every 4s while open —
  fine for v1, but there's no push notification for a new message when the
  app isn't open. Worth adding (Expo push, same pattern as a typical Expo
  app) once there's real usage to justify it.
- **No payments/escrow, no grading integration** — both explicitly deferred
  to Phase 2 per the original plan.
- **No splash screen asset** — the app icon (`app/assets/icon.png`, the
  TrainerTrade badge mark) is in place, but `app.json`'s splash screen is
  still just a solid background colour with no logo image on it.
- A real async-error bug was caught and fixed during scaffolding: Express 4
  doesn't forward a rejected promise from an `async` route handler to error
  middleware by default, so an unhandled rejection (e.g. an external API
  call failing) would crash the whole process. Fixed via
  `express-async-errors` (`backend/src/index.ts`) plus a catch-all error
  handler that returns a `500` instead. Worth knowing if you add more async
  routes that skip their own try/catch.
- **SQLite is Node's built-in `node:sqlite` module, not `better-sqlite3`.**
  Started as `better-sqlite3`, but that's a native module requiring a C++
  toolchain to compile on install — fine on some machines, but a hard wall on
  a fresh Windows setup without Python/Visual Studio Build Tools installed
  (`npm install` fails with a node-gyp error). Since Node 22.5 ships an
  equivalent SQLite module built in, `backend/src/db.ts` uses that instead —
  same `.prepare().get()/.all()/.run()` shape, zero native compilation, so
  `npm install` just works everywhere. Needs **Node 22.5+**. Its own types
  are stricter than this codebase wants (no `undefined` params, no loose
  `any` results), so `db.ts` exports a thin `prepare()` wrapper that loosens
  both back — that's what every route imports instead of raw `node:sqlite`.

## Running locally

### Backend

```bash
cd backend
npm install
cp .env.example .env
npm run dev       # starts on :3001
```

Registering a user needs a reachable `api.postcodes.io` (for the postcode)
and adding a card to a list needs `api.pokemontcg.io` — both are free with
no signup required, just normal internet access.

### App

```bash
cd app
npm install
# Edit src/config.ts to point API_BASE_URL at your backend
# (use your machine's LAN IP, not localhost, when testing on a physical device)
npm start
```

On signup, the app tells you to check the backend's console output for the
verification code (see "Auth is dev-stubbed" above).

## API smoke test

The backend's core flow (match engine, swipe → mutual match → chat → trade
confirmation → rating → report) was verified end-to-end against seeded
SQLite rows during scaffolding, working around the two blocked external
APIs above. The match engine correctly surfaced a mutual match, ranked it
first, and computed the right distance and card overlap.
