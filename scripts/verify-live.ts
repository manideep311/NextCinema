/**
 * Live end-to-end verification against a running NextCinema server.
 *
 *   MONGODB_DB=nextcinema_verify npm run build && npm start   (use a throwaway database!)
 *   BASE_URL=http://localhost:3000 npm run verify:live
 *
 * Creates two throwaway accounts (random emails/passwords, never printed),
 * then checks authentication, cross-user authorization (substituting the
 * other user's id wherever a client could try), CSRF/validation/rate-limit
 * behavior, journey progress semantics, search, and recommendations.
 * Reads AUTH_SECRET from the environment only to forge an *expired* token.
 */
import { randomBytes } from "node:crypto";
import { SignJWT, UnsecuredJWT } from "jose";
import { JOURNEY_DEFINITIONS } from "../lib/journeys/definitions";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const results: { name: string; ok: boolean; detail?: string }[] = [];

function check(name: string, ok: boolean, detail?: string) {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
}

interface Client {
  cookie: string | null;
  id?: string;
}

async function call(client: Client | null, path: string, init: RequestInit & { json?: unknown } = {}) {
  const headers = new Headers(init.headers);
  if (client?.cookie) headers.set("cookie", client.cookie);
  let body = init.body;
  if (init.json !== undefined) {
    headers.set("content-type", "application/json");
    body = JSON.stringify(init.json);
  }
  const res = await fetch(`${BASE}${path}`, { ...init, headers, body, redirect: "manual" });
  const setCookie = res.headers.get("set-cookie");
  if (client && setCookie?.startsWith("cinematch_session=")) {
    const value = setCookie.split(";")[0];
    client.cookie = value === "cinematch_session=" ? null : value;
  }
  const text = await res.text();
  let data: unknown = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { res, data: data as Record<string, unknown> & string, setCookie, text };
}

function newCredentials(tag: string) {
  return {
    name: `Verify ${tag}`,
    email: `verify-${tag}-${randomBytes(4).toString("hex")}@example.test`,
    password: randomBytes(12).toString("base64url"),
  };
}

async function main() {
  // --- Authentication -----------------------------------------------------------
  const credsA = newCredentials("a");
  const credsB = newCredentials("b");
  const A: Client = { cookie: null };
  const B: Client = { cookie: null };

  const signupA = await call(A, "/api/auth/signup", { method: "POST", json: credsA });
  check("signup succeeds", signupA.res.status === 200 && Boolean(A.cookie));
  check(
    "session cookie is HttpOnly, SameSite=Lax, Path=/",
    /HttpOnly/i.test(signupA.setCookie ?? "") && /SameSite=lax/i.test(signupA.setCookie ?? "") && /Path=\//.test(signupA.setCookie ?? "")
  );
  check("token is never in a response body", !JSON.stringify(signupA.data).includes(A.cookie!.split("=")[1]));
  A.id = (signupA.data.user as { id: string }).id;
  await call(B, "/api/auth/signup", { method: "POST", json: credsB });
  B.id = ((await call(B, "/api/auth/session")).data.user as { id: string }).id;

  const dupe = await call(null, "/api/auth/signup", { method: "POST", json: credsA });
  check("duplicate signup rejected with a generic message", dupe.res.status === 409 && !String(dupe.data.error).toLowerCase().includes("exists"));
  const smuggled = await call(null, "/api/auth/signup", { method: "POST", json: { ...newCredentials("x"), role: "admin" } });
  check("signup with extra 'role' field rejected", smuggled.res.status === 400);

  const wrongPw = await call(null, "/api/auth/login", { method: "POST", json: { email: credsA.email, password: "wrong-password" } });
  const noUser = await call(null, "/api/auth/login", { method: "POST", json: { email: "nobody-here@example.test", password: "whatever-123" } });
  check(
    "wrong password and unknown email are indistinguishable",
    wrongPw.res.status === 401 && noUser.res.status === 401 && wrongPw.data.error === noUser.data.error
  );

  const login = await call({ cookie: null }, "/api/auth/login", { method: "POST", json: { email: credsA.email.toUpperCase(), password: credsA.password } });
  check("login works (email case-insensitive)", login.res.status === 200);

  const malformed = await call({ cookie: "cinematch_session=not.a.jwt" }, "/api/auth/session");
  check("malformed session → signed out", malformed.data.user === null);

  const secret = new TextEncoder().encode(process.env.AUTH_SECRET ?? "");
  const now = Math.floor(Date.now() / 1000);
  const expired = await new SignJWT({ email: credsA.email, name: credsA.name, role: "user" })
    .setProtectedHeader({ alg: "HS256" }).setSubject(A.id!).setIssuer("nextcinema").setAudience("nextcinema:web")
    .setIssuedAt(now - 10 * 86400).setExpirationTime(now - 3 * 86400).sign(secret);
  const expiredRes = await call({ cookie: `cinematch_session=${expired}` }, "/api/favorites");
  check("expired session → 401 on user data", expiredRes.res.status === 401);
  const noneAlg = new UnsecuredJWT({ email: credsA.email, name: credsA.name, role: "admin" })
    .setSubject(A.id!).setIssuer("nextcinema").setAudience("nextcinema:web").setIssuedAt().setExpirationTime("1h").encode();
  check("alg:none session → 401", (await call({ cookie: `cinematch_session=${noneAlg}` }, "/api/favorites")).res.status === 401);

  const protectedPage = await call({ cookie: `cinematch_session=${expired}` }, "/dashboard/favorites");
  check(
    "protected page with expired session redirects to login and clears cookie",
    protectedPage.res.status === 307 &&
      (protectedPage.res.headers.get("location") ?? "").includes("/login?redirect=%2Fdashboard%2Ffavorites") &&
      /cinematch_session=;/.test(protectedPage.setCookie ?? "")
  );

  const L: Client = { cookie: login.setCookie!.split(";")[0] };
  const logout = await call(L, "/api/auth/logout", { method: "POST" });
  check("logout clears the cookie", logout.res.status === 200 && /Max-Age=0/i.test(logout.setCookie ?? "") && L.cookie === null);

  // --- Authorization / IDOR ------------------------------------------------------------
  const FIGHT_CLUB = 550;
  await call(A, "/api/favorites", { method: "POST", json: { movieId: FIGHT_CLUB } });
  const aFavs = (await call(A, "/api/favorites")).data.favorites as { id: number; title: string }[];
  check("favorite saved with server-resolved snapshot", aFavs.some((m) => m.id === FIGHT_CLUB && m.title === "Fight Club"));

  const bFavs = (await call(B, "/api/favorites")).data.favorites as { id: number }[];
  check("user B cannot see user A's favorites", !bFavs.some((m) => m.id === FIGHT_CLUB));
  const idorWrite = await call(B, "/api/favorites", { method: "POST", json: { movieId: 680, userId: A.id } });
  check("substituting A's userId in B's write is rejected", idorWrite.res.status === 400);
  const idorQuery = await call(B, `/api/favorites?userId=${A.id}`);
  check("substituting A's userId in the query string is ignored", !(idorQuery.data.favorites as { id: number }[]).some((m) => m.id === FIGHT_CLUB));
  await call(B, "/api/favorites", { method: "DELETE", json: { movieId: FIGHT_CLUB } });
  const aAfter = (await call(A, "/api/favorites")).data.favorites as { id: number }[];
  check("user B deleting the same movie id doesn't touch A's favorite", aAfter.some((m) => m.id === FIGHT_CLUB));

  await call(A, "/api/watchlist", { method: "POST", json: { movieId: 680 } });
  check("user B cannot see user A's watchlist", !((await call(B, "/api/watchlist")).data.watchlist as { id: number }[]).some((m) => m.id === 680));

  await call(A, "/api/history", { method: "POST", json: { movieId: 13 } });
  check("user B cannot see user A's history", ((await call(B, "/api/history")).data.history as unknown[]).length === 0);

  for (const [path, method] of [["/api/favorites", "GET"], ["/api/watchlist", "GET"], ["/api/history", "GET"], ["/api/recommendations/for-you", "GET"], ["/api/movies/surprise", "GET"]] as const) {
    check(`unauthenticated ${method} ${path} → 401`, (await call(null, path, { method })).res.status === 401);
  }
  check("unauthenticated mark-watched → 401", (await call(null, "/api/journeys/watched", { method: "POST", json: { movieId: 1726 } })).res.status === 401);

  const profileB = await call(B, "/dashboard/profile");
  check("profile shows only the session user", profileB.text.includes(credsB.email) && !profileB.text.includes(credsA.email));

  // --- Journey progress semantics ---------------------------------------------------------
  const IRON_MAN = 1726;
  const IRON_MAN_2 = 10138;
  await call(A, "/api/history", { method: "POST", json: { movieId: IRON_MAN_2 } });
  const afterView = await call(A, "/dashboard/journeys/mcu-infinity-saga");
  check("viewing a movie does NOT count as watched", afterView.text.includes("0<!-- --> / <!-- -->23<!-- --> watched"), "expects 0 / 23");
  const mark = await call(A, "/api/journeys/watched", { method: "POST", json: { movieId: IRON_MAN, journeyId: "mcu-infinity-saga" } });
  await call(A, "/api/journeys/watched", { method: "POST", json: { movieId: IRON_MAN, journeyId: "mcu-infinity-saga" } });
  const aJourney = await call(A, "/dashboard/journeys/mcu-infinity-saga");
  check("marking watched advances progress (idempotent)", mark.res.status === 200 && aJourney.text.includes("1<!-- --> / <!-- -->23<!-- --> watched"));
  const bJourney = await call(B, "/dashboard/journeys/mcu-infinity-saga");
  check("user B's journey progress is unaffected by A", bJourney.text.includes("0<!-- --> / <!-- -->23<!-- --> watched"));
  const badJourney = await call(A, "/api/journeys/watched", { method: "POST", json: { movieId: IRON_MAN, journeyId: "not-a-journey" } });
  check("unknown journeyId rejected", badJourney.res.status === 400);
  const dashboard = await call(A, "/dashboard");
  check("dashboard features the journey A marked progress in", dashboard.text.includes("Your Next Chapter") && dashboard.text.includes("Marvel Cinematic Universe"));

  // --- CSRF / validation -------------------------------------------------------------------
  const crossSite = await call(A, "/api/favorites", {
    method: "POST",
    json: { movieId: 603 },
    headers: { origin: "https://evil.example", "sec-fetch-site": "cross-site" },
  });
  check("cross-site POST blocked", crossSite.res.status === 403);
  check("wrong content type → 415", (await call(A, "/api/favorites", { method: "POST", body: "movieId=1", headers: { "content-type": "application/x-www-form-urlencoded" } })).res.status === 415);
  check("malformed JSON → 400", (await call(A, "/api/favorites", { method: "POST", body: "{", headers: { "content-type": "application/json" } })).res.status === 400);
  check("oversized body → 413", (await call(A, "/api/favorites", { method: "POST", json: { movieId: 1, pad: "x".repeat(5000) } })).res.status === 413);
  check("string movieId → 400", (await call(A, "/api/favorites", { method: "POST", json: { movieId: "550" } })).res.status === 400);
  check("nonexistent movie → 404", (await call(A, "/api/favorites", { method: "POST", json: { movieId: 2147483600 } })).res.status === 404);
  check("negative page → 400", (await call(null, "/api/movies/by-industry?industry=hollywood&page=-1")).res.status === 400);
  check("absurd page → 400", (await call(null, "/api/movies/by-industry?industry=hollywood&page=99999")).res.status === 400);
  check("unknown industry → 400", (await call(null, "/api/movies/by-industry?industry=nope")).res.status === 400);
  check("huge search query → 400", (await call(null, `/api/search?q=${"a".repeat(150)}`)).res.status === 400);
  check("bad limit → 400", (await call(A, "/api/recommendations/for-you?limit=500")).res.status === 400);
  // These routes stream (loading.tsx), so Next serves notFound() as the not-found UI + noindex
  // with status 200 — the status can't change once streaming has started.
  const isNotFound = (html: string) => html.includes("Not found") && html.includes('content="noindex"');
  check("non-numeric movie route → not-found page", isNotFound((await call(null, "/dashboard/movie/abc")).text));
  check("invalid journey id → not-found page", isNotFound((await call(null, "/dashboard/journeys/Not_Valid")).text));
  check("unknown API movie → real 404 status", (await call(null, "/api/nope")).res.status === 404);

  // --- Recommendations -----------------------------------------------------------------------
  const forYouA = await call(A, "/api/recommendations/for-you");
  const aMovies = forYouA.data.movies as { id: number; matchScore: number | null; reasons: unknown[] }[];
  check(
    "For You (with a favorite): similarity basis, 0–100 scores, reasons, favorite excluded",
    forYouA.data.basis === "similarity" && aMovies.length > 0 &&
      aMovies.every((m) => typeof m.matchScore === "number" && m.matchScore >= 0 && m.matchScore <= 100) &&
      !aMovies.some((m) => m.id === FIGHT_CLUB),
    `scores ${aMovies.map((m) => m.matchScore).join(",")}`
  );
  const forYouB = await call(B, "/api/recommendations/for-you");
  check(
    "For You (no favorites): popular basis with NO match score",
    forYouB.data.basis === "popular" && (forYouB.data.movies as { matchScore: number | null }[]).every((m) => m.matchScore === null)
  );
  const surprise = await call(A, "/api/movies/surprise");
  check("Surprise me returns a movie", surprise.res.status === 200 && Boolean((surprise.data.movie as { id?: number })?.id));

  // --- Journeys catalog ---------------------------------------------------------------------------
  const started = Date.now();
  const journeysPage = await call(null, "/dashboard/journeys");
  const listed = new Set([...journeysPage.text.matchAll(/href="\/dashboard\/journeys\/([a-z0-9-]+)"/g)].map((m) => m[1]));
  const byType: Record<string, number> = {};
  for (const d of JOURNEY_DEFINITIONS) if (listed.has(d.id)) byType[d.type] = (byType[d.type] ?? 0) + 1;
  const hidden = JOURNEY_DEFINITIONS.filter((d) => !listed.has(d.id)).map((d) => d.id);
  check(
    "journey catalog renders available journeys of every type",
    ["franchise", "genre", "theme", "mood", "discovery"].every((t) => (byType[t] ?? 0) > 0) && !byType.language,
    `${listed.size}/${JOURNEY_DEFINITIONS.length} shown in ${Date.now() - started}ms · ${JSON.stringify(byType)}`
  );
  console.log(`      hidden (insufficient/unresolvable data): ${hidden.join(", ") || "none"}`);
  const again = Date.now();
  await call(null, "/dashboard/journeys");
  console.log(`      second load: ${Date.now() - again}ms`);

  const chrono = await call(null, "/dashboard/journeys/star-wars-skywalker-saga?order=chronological");
  check("chronological order supported where documented", chrono.res.status === 200 && chrono.text.includes("Chronological"));
  const hp = await call(null, "/dashboard/journeys/harry-potter?order=chronological");
  check("unsupported order falls back (no invented timeline)", hp.res.status === 200 && !hp.text.includes("Choose your watch order"));

  // --- Search ---------------------------------------------------------------------------------------
  for (const q of ["Something like Interstellar", "Underrated 90s sci-fi", "I'm sad — cheer me up", "Movies with mind-blowing plot twists", "Slow emotional dramas with a happy ending", "tom hanks", "directed by Christopher Nolan", "telugu action", "star wars", "1917", "love actually", "harry potter"]) {
    const res = await call(null, `/api/search?q=${encodeURIComponent(q)}`);
    const titles = ((res.data.results as { title: string }[]) ?? []).slice(0, 3).map((m) => m.title).join(" | ");
    const journeys = ((res.data.journeys as { name: string }[]) ?? []).map((j) => j.name).join(", ");
    check(`search "${q}"`, res.res.status === 200 && (res.data.results as unknown[]).length > 0,
      `${res.data.mode}${res.data.label ? ` · ${res.data.label}` : ""} → ${titles}${journeys ? ` · journeys: ${journeys}` : ""}`);
  }

  // --- Opening intro: first page load of a browsing session only ------------------------------
  const firstVisit = await call(null, "/");
  check(
    "opening intro renders on the session's first page load and marks the session",
    firstVisit.text.includes('class="nc-intro"') && /nc_intro_seen=1/.test(firstVisit.setCookie ?? "")
  );
  const laterVisit = await call({ cookie: "nc_intro_seen=1" }, "/dashboard/journeys");
  check("opening intro never replays in the same session", !laterVisit.text.includes('class="nc-intro"'));
  const spoofed = await call(null, "/", { headers: { cookie: "nc_intro_seen=1", "x-nc-intro": "1" } });
  check("a client can't force the intro via the internal header", !spoofed.text.includes('class="nc-intro"'));

  // --- Rate limiting (last: it exhausts this IP's search budget) ---------------------------------
  let limitedAt = -1;
  for (let i = 0; i < 70; i++) {
    const res = await call(null, `/api/search?q=rate${i}`);
    if (res.res.status === 429) {
      limitedAt = i;
      check("search is rate limited with Retry-After", Boolean(res.res.headers.get("retry-after")), `429 after ${i} extra requests`);
      break;
    }
  }
  if (limitedAt < 0) check("search is rate limited", false, "no 429 within 70 requests");

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) process.exit(1);
}

main().catch((error) => {
  console.error("verify-live crashed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
