import { NextResponse, type NextRequest } from "next/server";
import { requireRequestSession } from "@/lib/auth/session";
import { enforceRateLimit, jsonError, PRIVATE_NO_STORE } from "@/lib/http";
import { getHiddenGemPool } from "@/services/surprise";
import { listFavoriteIds } from "@/services/favorites";
import { listWatchlistIds } from "@/services/watchlist";
import { listAllWatchedIds } from "@/services/watched";

/**
 * The assistant's "Surprise me": a random pick from a real hidden-gem pool
 * (see services/surprise.ts), skipping anything the user has already
 * favorited, watchlisted, or marked watched. Signed-in only, like the assistant.
 */
export async function GET(request: NextRequest) {
  const auth = await requireRequestSession(request);
  if (auth.response) return auth.response;

  const limited = enforceRateLimit(request, "assistant", auth.session.userId);
  if (limited) return limited;

  try {
    const [pool, favorites, watchlist, watched] = await Promise.all([
      getHiddenGemPool(),
      listFavoriteIds(auth.session.userId),
      listWatchlistIds(auth.session.userId),
      listAllWatchedIds(auth.session.userId),
    ]);
    const known = new Set([...favorites, ...watchlist, ...watched]);
    const fresh = pool.filter((movie) => !known.has(movie.id));
    const candidates = fresh.length > 0 ? fresh : pool;
    if (candidates.length === 0) return jsonError(404, "Nothing to suggest right now.", PRIVATE_NO_STORE);

    const movie = candidates[Math.floor(Math.random() * candidates.length)];
    return NextResponse.json({ movie }, { headers: PRIVATE_NO_STORE });
  } catch {
    return jsonError(502, "Couldn't find a hidden gem right now.", PRIVATE_NO_STORE);
  }
}
