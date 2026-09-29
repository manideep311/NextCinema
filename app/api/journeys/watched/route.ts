import { NextResponse, type NextRequest } from "next/server";
import { requireRequestSession } from "@/lib/auth/session";
import { enforceRateLimit, jsonError, parseJsonBody, PRIVATE_NO_STORE, rejectCrossSite } from "@/lib/http";
import { movieRefBodySchema, watchedBodySchema } from "@/lib/validation";
import { getJourneyDefinition } from "@/lib/journeys/definitions";
import { markWatched, unmarkWatched } from "@/services/watched";
import { MovieNotFoundError, resolveMovieSnapshot } from "@/services/movie-snapshot";

/**
 * Explicit "I watched this" — the only thing that advances journey
 * progress. Scoped to the session user; the optional journeyId only
 * records *where* it was marked from, and must be a known journey.
 */
export async function POST(request: NextRequest) {
  const crossSite = rejectCrossSite(request);
  if (crossSite) return crossSite;

  const auth = await requireRequestSession(request);
  if (auth.response) return auth.response;

  const limited = enforceRateLimit(request, "library-write", auth.session.userId);
  if (limited) return limited;

  const body = await parseJsonBody(request, watchedBodySchema);
  if (!body.ok) return body.response;

  const journeyId = body.data.journeyId ?? null;
  if (journeyId && !getJourneyDefinition(journeyId)) {
    return jsonError(400, "Unknown journey.", PRIVATE_NO_STORE);
  }

  try {
    const movie = await resolveMovieSnapshot(body.data.movieId);
    await markWatched(auth.session.userId, movie, journeyId);
    return NextResponse.json({ ok: true }, { headers: PRIVATE_NO_STORE });
  } catch (error) {
    if (error instanceof MovieNotFoundError) return jsonError(404, "Movie not found.", PRIVATE_NO_STORE);
    return jsonError(502, "Couldn't save that right now — please try again.", PRIVATE_NO_STORE);
  }
}

export async function DELETE(request: NextRequest) {
  const crossSite = rejectCrossSite(request);
  if (crossSite) return crossSite;

  const auth = await requireRequestSession(request);
  if (auth.response) return auth.response;

  const limited = enforceRateLimit(request, "library-write", auth.session.userId);
  if (limited) return limited;

  const body = await parseJsonBody(request, movieRefBodySchema);
  if (!body.ok) return body.response;

  await unmarkWatched(auth.session.userId, body.data.movieId);
  return NextResponse.json({ ok: true }, { headers: PRIVATE_NO_STORE });
}
