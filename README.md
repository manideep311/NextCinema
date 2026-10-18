# NextCinema

*Every great story begins with a good recommendation.*

Movie discovery with explainable content-based recommendations, built on
Next.js 16 and TMDB. A homegrown similarity score ranks each candidate and
shows *why* it was picked.

## Stack

- Next.js 16 (App Router) · React 19 · TypeScript
- Tailwind CSS v4 · shadcn/ui + Base UI · Framer Motion
- MongoDB via the official `mongodb` driver
- Auth: signed JWT session cookies (`jose`) + scrypt password hashing (`node:crypto`) — no third-party auth service required
- TMDB for movie data

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment variables** — copy the example file and fill it in:

   ```bash
   cp .env.local.example .env.local
   ```

   | Variable | Required for | Notes |
   |---|---|---|
   | `TMDB_API_READ_ACCESS_TOKEN` | all movie data | [Get one free from TMDB](https://www.themoviedb.org/settings/api) |
   | `NEXT_PUBLIC_TMDB_IMAGE_BASE_URL` | — (optional) | Image CDN base; defaults to `https://image.tmdb.org/t/p` (`lib/tmdb-images.ts`). A different host must also be added to `images.remotePatterns` in `next.config.ts` |
   | `MONGODB_URI` | accounts, favorites, watchlist, history | [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) has a free tier, or run MongoDB locally |
   | `MONGODB_DB` | — | Database name, defaults to `nextcinema`. Deployments created before the rename used `cinematch` — set `MONGODB_DB=cinematch` there to keep existing data |
   | `AUTH_SECRET` | sign in / sign up | Generate with `openssl rand -base64 32` |

   The app still runs and is browsable as a guest without `MONGODB_URI`/`AUTH_SECRET` set — browsing, search, trending, and categories all stay open. Favorites, watchlist, personalized recommendations, recently-viewed history, and the assistant all require an account.

3. **Create the database indexes** (once `MONGODB_URI` is set):

   ```bash
   npm run db:indexes
   ```

   MongoDB has no schema to migrate, but this creates the unique indexes (one favorite/watchlist/history entry per user per movie, unique user emails) and the sort indexes the app relies on. Safe to re-run any time.

4. **Run the dev server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Architecture notes

### Security
- **Sessions** (`lib/auth/token.ts`, `lib/auth/session.ts`) — HS256 JWT (issuer/audience/expiry checked, `alg` pinned, payload shape validated) in an `httpOnly`, `SameSite=Lax`, `Secure`-in-production cookie. 7-day lifetime with sliding renewal in `proxy.ts`. The token is never readable by browser JavaScript.
- **Authorization** — every user-scoped route runs `request → verify session → derive user id → rate limit → validate → act`. The user id comes only from the verified session; strict body schemas reject any client-sent `userId`. Protected pages check the session themselves — `proxy.ts`'s redirect is a UX shortcut, not the gate.
- **Passwords** (`lib/auth/password.ts`) — scrypt (N=2¹⁵, r=8, p=1) in a self-describing format; older hashes still verify and are upgraded on login. Unknown emails pay the same scrypt cost as wrong passwords, and both return the same error.
- **Input validation** (`lib/validation.ts`, `lib/http.ts`) — zod schemas for ids, pages, queries, and bodies; JSON bodies are size-capped and content-type checked; mutating requests are rejected cross-site (`Sec-Fetch-Site`/`Origin`).
- **Rate limiting** (`lib/rate-limit.ts`) — in-memory fixed windows per IP or per user for login, signup, search, recommendations, TMDB-backed routes, and writes. Per instance and best-effort by design (no extra infrastructure).

### Data
- **Public vs user data** — everything in `services/tmdb.ts` is public movie data cached in Next's Data Cache (`TMDB_CACHE` sets lifetimes by data type). User data (favorites, watchlist, history, watched) is never put in a shared cache.
- **TMDB client** (`lib/tmdb-client.ts`) — in-flight de-duplication, a concurrency cap, timeouts, and retries on 429/5xx.
- **MongoDB** — every index in `lib/db/indexes.ts` exists for a named query; list reads use projections, counts use `countDocuments`, and writes are idempotent (`$setOnInsert` upserts behind unique `(userId, movieId)` indexes).
- **Viewed vs watched** — `watch_history` records pages opened (Recently Viewed); `watched` records explicit "Mark as Watched" and is the only thing journey progress counts.

### Features
- **Recommendation engine** (`lib/recommendation-engine.ts`) — content-based, pure and deterministic. Each candidate is compared with the seed movie on six signals:

  | Signal | Weight | Similarity |
  |---|---|---|
  | Genres | 35% | Jaccard overlap of TMDB genre ids |
  | Keywords | 25% | Jaccard overlap of TMDB keywords |
  | Cast | 15% | Jaccard overlap of the top 5 billed cast, by TMDB person id |
  | Director | 10% | Jaccard overlap of all credited directors, by TMDB person id |
  | Rating | 10% | Closeness of Bayesian-adjusted ratings (prior 6.5, 100 votes): 1 − gap/3 |
  | Popularity | 5% | Closeness of log₁₀(1 + popularity): 1 − gap/2 |

  "% Match" is Σ similarity × weight ÷ Σ weight over the signals that apply: a signal the seed has no data for is skipped, and keywords/cast are also skipped when the *candidate* has none (missing data isn't evidence of difference). Candidates come from TMDB `/similar` (pages 1–2), `/recommendations`, and the most-voted `/discover` titles in the seed's top two genres, merged and de-duplicated (`lib/candidate-pool.ts`, up to 40). Every recommendation card has a **Why this?** panel showing each signal's similarity and weight. Per-movie results are cached as public data and shared by the movie page, For You, Recommendations and search. For You blends the lists of the user's five most recent favourites, weighted 1 → 0.2 by recency (`lib/personalization.ts`), then removes favourites and watched titles; with no favourites it shows popular picks *without* a match score.
- **Movie Journeys** (`lib/journeys/`) — data-driven: journeys are definitions (franchise, genre, theme, mood, discovery) with sources (curated lists, TMDB collections/keywords/discover/people/trending), hard rules, ranking weights, and a minimum size. Franchise journeys cover every kind — shared cinematic universes (MCU, DCEU, Wizarding World, Middle-earth, Conjuring, MonsterVerse, YRF Spy, Rohit Shetty's Cop Universe, LCU, Maddock), action, superhero, sci-fi/fantasy, animated, family, comedy, horror, crime, drama/romance, Indian (Telugu, Tamil, Hindi, Malayalam, Kannada), and world cinema — using TMDB collections matched by exact, verified name, or hand-verified lists where TMDB has no single collection. The pure engine (`lib/journeys/engine.ts`) filters, scores, diversifies, orders, and hides journeys that don't meet their threshold; `services/journeys.ts` caches each journey for its freshness (hourly/daily/weekly) so dynamic journeys refresh themselves. Alternate watch orders exist only where officially documented (curated journeys).
- **Search** (`lib/search/interpret.ts`, `services/search.ts`) — deterministic interpretation of titles, moods/genres, decades and year ranges, languages/Indian film industries, "like X" similarity, actors and directors, quality words ("underrated", "acclaimed"), and journeys. An exact title always wins; anything uninterpretable falls back to title search. No LLM.
- **Assistant** (`components/features/assistant/`) — not LLM-backed; code-split so guests never download it. "Surprise me" picks from a genuine hidden-gem pool.
- **Opening intro** (`components/features/intro/opening-intro.tsx`, `.nc-intro*` in `app/globals.css`) — a ~1.6s studio-title reveal of the existing wordmark on the first page load of a browsing session (a session cookie set by `proxy.ts`; never on client navigation or reloads). Pure CSS keyframes so it starts on first paint, before hydration, while the page renders underneath; skippable with a click or Enter/Esc/Space; not shown at all with `prefers-reduced-motion`.
- **Where to Watch** (`lib/region.ts`) — India by default (`WATCH_REGION` to change); uses the platform's visitor-country header when one is present.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (Node's built-in test runner via `tsx`): engine, journeys, search, auth, validation |
| `npm run db:indexes` | Create/update MongoDB indexes on `MONGODB_URI` |
| `npm run verify:live` | End-to-end checks against a running server (`BASE_URL`); creates throwaway accounts — point the server at a test database |

## Known limitations

- Rate limits are per server instance (in-memory), so they're best-effort across multiple instances.
- The first request after a cold deploy builds the journey catalog (~5s measured locally); later requests are served from cache.
- Landing-page testimonials, the "As imagined in" press names, and the genre/mood/decade demo are illustrative placeholders, and the Company/Legal footer links have no pages yet.
