# NextCinema

*Every great story begins with a good recommendation.*

An AI-powered movie recommendation platform built on Next.js 16, TMDB, and a
homegrown similarity-scoring recommendation engine that explains *why* each
match was picked.

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
   | `NEXT_PUBLIC_TMDB_IMAGE_BASE_URL` | posters/backdrops | Defaults to `https://image.tmdb.org/t/p` |
   | `MONGODB_URI` | accounts, favorites, watchlist, history | [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) has a free tier, or run MongoDB locally |
   | `MONGODB_DB` | — | Database name, defaults to `cinematch` |
   | `AUTH_SECRET` | sign in / sign up | Generate with `openssl rand -base64 32` |

   The app still runs and is browsable as a guest without `MONGODB_URI`/`AUTH_SECRET` set — browsing, search, trending, and categories all stay open. Favorites, watchlist, personalized recommendations, recently-viewed history, and the AI assistant all require an account.

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

- **Recommendation engine** (`lib/recommendation-engine.ts`) — pure, side-effect-free scoring function (genre/keyword/cast/director/rating/popularity weighted similarity), swappable independently of the rest of the app.
- **Auth** (`lib/auth/`) — session is a signed JWT in an httpOnly cookie, verified on the server via `getSession()`. No external auth provider or dependency beyond `jose`.
- **Favorites / Watchlist** — account-only. Signed-in users get MongoDB-backed persistence (`services/favorites.ts`, `services/watchlist.ts`); signed-out visitors are redirected to sign in when they try to save something, rather than getting a Local Storage save that could never be seen again.
- **Recently Viewed / History** — account-only. Signed-in users get MongoDB-backed history (`services/watch-history.ts`, `hooks/use-recently-viewed.ts`); guests see nothing recorded and nothing persisted.
- **Search** (`/dashboard/search`, and the ⌘K command palette from any dashboard page) — title search plus deterministic mood/genre matching (`lib/mood-lexicon.ts`), no LLM involved. Guest-accessible; recent searches are only stored for signed-in users.
- **"For You"** (`services/for-you.ts`) — seeded from the user's most recently favorited movie. Account-only in the UI and gated server-side in `/api/recommendations/for-you`.
- **Categories** (`/dashboard/categories`) — browse by industry (Tollywood/Bollywood/Kollywood/Mollywood/Hollywood via TMDB's `original_language` filter, plus an "Other" catch-all). Guest-accessible, like Trending and Search.
- **AI assistant** (`components/features/assistant/`) — a mascot + holographic quick-action panel, signed-in users only. Not LLM-backed: every answer comes from the existing recommendation engine, trending, and search endpoints, code-split via `next/dynamic` so guests never download it.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run db:indexes` | Create/update MongoDB indexes on `MONGODB_URI` |
