import { NextResponse, type NextRequest } from "next/server";
import { requireRequestSession } from "@/lib/auth/session";
import { enforceRateLimit, jsonError, parseJsonBody, PRIVATE_NO_STORE, rejectCrossSite } from "@/lib/http";
import { movieRefBodySchema } from "@/lib/validation";
import { listWatchHistory, recordView } from "@/services/watch-history";
import { MovieNotFoundError, resolveMovieSnapshot } from "@/services/movie-snapshot";

/** "Viewed/opened" history (Recently Viewed). Viewing never counts as watching — see /api/journeys/watched. */
export async function GET(request: NextRequest) {
  const auth = await requireRequestSession(request);
  if (auth.response) return auth.response;

  const limited = enforceRateLimit(request, "library-read", auth.session.userId);
  if (limited) return limited;

  const history = await listWatchHistory(auth.session.userId);
  return NextResponse.json({ history }, { headers: PRIVATE_NO_STORE });
}

export async function POST(request: NextRequest) {
  const crossSite = rejectCrossSite(request);
  if (crossSite) return crossSite;

  // Guests browse freely; their views just aren't recorded anywhere.
  const auth = await requireRequestSession(request);
  if (auth.response) return NextResponse.json({ ok: true, persisted: false }, { headers: PRIVATE_NO_STORE });

  const limited = enforceRateLimit(request, "library-write", auth.session.userId);
  if (limited) return limited;

  const body = await parseJsonBody(request, movieRefBodySchema);
  if (!body.ok) return body.response;

  try {
    // Same cached request the movie page just made — no extra TMDB call.
    const movie = await resolveMovieSnapshot(body.data.movieId, { prefer: "extras" });
    await recordView(auth.session.userId, movie);
    return NextResponse.json({ ok: true, persisted: true }, { headers: PRIVATE_NO_STORE });
  } catch (error) {
    if (error instanceof MovieNotFoundError) return jsonError(404, "Movie not found.", PRIVATE_NO_STORE);
    return jsonError(502, "Couldn't record that view.", PRIVATE_NO_STORE);
  }
}
