/**
 * Offline evaluation of the recommendation engine against two baselines.
 *
 * Usage: npm run eval   (needs TMDB_API_READ_ACCESS_TOKEN in .env / .env.local)
 *
 * For ~50 of TMDB's most-voted movies it builds the production candidate
 * pool *without* /recommendations, ranks it three ways (TMDB /similar
 * order, genre-only Jaccard, the engine), and scores each top 10 against
 * TMDB's /recommendations list as weak ground truth: precision@10 and
 * nDCG@10. Results are printed and written into docs/evaluation.md between
 * the results markers. Method and caveats: docs/evaluation.md.
 *
 * TMDB responses are cached under node_modules/.cache/nextcinema-eval so a
 * re-run is fast and repeatable; pass --fresh to refetch.
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { MAX_CANDIDATES, buildCandidatePool, seedDiscoverGenres } from "../lib/candidate-pool";
import { EVAL_K, METHODS, METHOD_LABELS, evaluateSeed, summarize, type SeedResult } from "../lib/evaluation";
import type { TmdbMovieWithExtras } from "../services/tmdb";
import type { TmdbMovie, TmdbPaginatedResponse } from "../types/tmdb";

const TMDB = "https://api.themoviedb.org/3";
const SEED_COUNT = 50;
const CONCURRENCY = 8;
const CACHE_DIR = path.join(process.cwd(), "node_modules", ".cache", "nextcinema-eval");
const DOC_PATH = path.join(process.cwd(), "docs", "evaluation.md");
const RESULTS_START = "<!-- eval-results:start -->";
const RESULTS_END = "<!-- eval-results:end -->";
const fresh = process.argv.includes("--fresh");

const token = process.env.TMDB_API_READ_ACCESS_TOKEN;
if (!token) {
  console.error("TMDB_API_READ_ACCESS_TOKEN is not set (add it to .env.local).");
  process.exit(1);
}

// --- TMDB access: cached, concurrency-limited, retried ------------------------

let active = 0;
const queue: (() => void)[] = [];
async function withSlot<T>(task: () => Promise<T>): Promise<T> {
  if (active >= CONCURRENCY) await new Promise<void>((resolve) => queue.push(resolve));
  else active++;
  try {
    return await task();
  } finally {
    const next = queue.shift();
    if (next) next();
    else active--;
  }
}

async function tmdb<T>(pathname: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${TMDB}${pathname}`);
  for (const key of Object.keys(params).sort()) url.searchParams.set(key, params[key]);
  const cacheFile = path.join(CACHE_DIR, `${createHash("sha256").update(url.toString()).digest("hex")}.json`);

  if (!fresh) {
    try {
      return JSON.parse(await readFile(cacheFile, "utf8")) as T;
    } catch {
      // Not cached yet.
    }
  }

  return withSlot(async () => {
    for (let attempt = 1; ; attempt++) {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
        signal: AbortSignal.timeout(15_000),
      }).catch((error: unknown) => {
        if (attempt >= 4) throw error;
        return null;
      });
      if (response?.ok) {
        const body = (await response.json()) as T;
        await writeFile(cacheFile, JSON.stringify(body));
        return body;
      }
      if (response && response.status !== 429 && response.status < 500) {
        throw new Error(`TMDB ${response.status} for ${pathname}`);
      }
      if (attempt >= 4) throw new Error(`TMDB ${response?.status ?? "network error"} for ${pathname} after ${attempt} attempts`);
      await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
    }
  });
}

const NO_RESULTS: TmdbPaginatedResponse<TmdbMovie> = { page: 1, results: [], total_pages: 0, total_results: 0 };
const list = (pathname: string, params: Record<string, string> = {}) =>
  tmdb<TmdbPaginatedResponse<TmdbMovie>>(pathname, params).catch(() => NO_RESULTS);
const extras = (id: number) => tmdb<TmdbMovieWithExtras>(`/movie/${id}`, { append_to_response: "credits,keywords" });

// --- Run ------------------------------------------------------------------------

/** Seeds: TMDB's most-voted movies (deterministic for a given day, and well covered by TMDB's own lists). */
async function selectSeeds(): Promise<TmdbMovie[]> {
  const pages = await Promise.all(
    [1, 2, 3].map((page) => list("/discover/movie", { sort_by: "vote_count.desc", include_adult: "false", page: String(page) }))
  );
  return pages.flatMap((page) => page.results).filter((movie) => movie.genre_ids.length > 0).slice(0, SEED_COUNT);
}

async function evaluate(seedMovie: TmdbMovie, today: string): Promise<SeedResult | null> {
  const seed = await extras(seedMovie.id).catch(() => null);
  if (!seed) return null;
  const genres = seedDiscoverGenres(seed.genres.map((genre) => genre.id));
  const [similarFirst, similarSecond, discovered, recommendations] = await Promise.all([
    list(`/movie/${seed.id}/similar`, { page: "1" }),
    list(`/movie/${seed.id}/similar`, { page: "2" }),
    genres ? list("/discover/movie", { with_genres: genres, sort_by: "vote_count.desc", include_adult: "false" }) : NO_RESULTS,
    list(`/movie/${seed.id}/recommendations`, { page: "1" }),
  ]);
  const similar = [...similarFirst.results, ...similarSecond.results];

  // Profile exactly the movies that can be in the pool (built without /recommendations).
  const pool = buildCandidatePool(seed.id, [similar, discovered.results], today, MAX_CANDIDATES);
  const fetched = await Promise.all(pool.map((movie) => extras(movie.id).catch(() => null)));
  const profiles = new Map(fetched.flatMap((profile) => (profile ? [[profile.id, profile] as const] : [])));

  return evaluateSeed({ seed, similar, discover: discovered.results, groundTruth: recommendations.results, profiles }, today);
}

const fmt = (value: number) => value.toFixed(3);

function report(results: SeedResult[], today: string): string {
  const summary = summarize(results);
  const rows = METHODS.map(
    (method) => `| ${METHOD_LABELS[method]} | ${fmt(summary.methods[method].precision)} | ${fmt(summary.methods[method].ndcg)} |`
  );
  const seedRows = results.map(
    (r) =>
      `| ${r.seedTitle} | ${r.seedId} | ${r.poolSize} | ${r.groundTruthSize} | ${r.reachable} | ${METHODS.map((m) => fmt(r.scores[m].precision)).join(" | ")} |`
  );
  return [
    `Run on **${today}** with \`npm run eval\` — ${summary.seeds} seeds with a non-empty ground truth (of ${results.length} evaluated).`,
    "",
    `| Method | precision@${EVAL_K} | nDCG@${EVAL_K} |`,
    "|---|---|---|",
    ...rows,
    "",
    `Pools averaged ${summary.meanPoolSize.toFixed(1)} candidates; ground truth averaged ${summary.meanGroundTruthSize.toFixed(1)} movies, of which ${summary.meanReachable.toFixed(1)} were in the pool (${summary.meanReachableViaSimilar.toFixed(1)} of them returned by /similar; the rest only by /discover). That caps precision@${EVAL_K} for *any* re-ranking of these pools at **${fmt(summary.precisionCeiling)}**.`,
    "",
    "<details><summary>Per-seed results (precision@10)</summary>",
    "",
    `| Seed | TMDB id | Pool | Ground truth | In pool | ${METHODS.map((m) => METHOD_LABELS[m]).join(" | ")} |`,
    `|---|---|---|---|---|${METHODS.map(() => "---").join("|")}|`,
    ...seedRows,
    "",
    "</details>",
  ].join("\n");
}

async function main() {
  await mkdir(CACHE_DIR, { recursive: true });
  const today = new Date().toISOString().slice(0, 10);
  const seeds = await selectSeeds();
  if (seeds.length === 0) throw new Error("Could not load seed movies from TMDB.");
  console.log(`Evaluating ${seeds.length} seeds…`);

  const results: SeedResult[] = [];
  for (const [index, seed] of seeds.entries()) {
    const result = await evaluate(seed, today);
    if (result) results.push(result);
    process.stdout.write(`\r${index + 1}/${seeds.length} ${seed.title.slice(0, 40).padEnd(40)}`);
  }
  process.stdout.write("\n\n");

  const markdown = report(results, today);
  console.log(markdown);

  const doc = await readFile(DOC_PATH, "utf8");
  const start = doc.indexOf(RESULTS_START);
  const end = doc.indexOf(RESULTS_END);
  if (start === -1 || end === -1) throw new Error(`Results markers not found in ${DOC_PATH}.`);
  await writeFile(DOC_PATH, `${doc.slice(0, start + RESULTS_START.length)}\n${markdown}\n${doc.slice(end)}`);
  console.log(`\nWrote results to ${path.relative(process.cwd(), DOC_PATH)}`);
}

main().catch((error: unknown) => {
  // Message only — never the token.
  console.error("Evaluation failed:", error instanceof Error ? error.message : "unknown error");
  process.exit(1);
});
