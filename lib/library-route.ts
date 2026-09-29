import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { requireRequestSession } from "@/lib/auth/session";
import { enforceRateLimit, jsonError, parseJsonBody, PRIVATE_NO_STORE, rejectCrossSite } from "@/lib/http";
import { movieRefBodySchema } from "@/lib/validation";
import { MovieNotFoundError, resolveMovieSnapshot, type MovieSnapshot } from "@/services/movie-snapshot";
import type { StoredMovie } from "@/types/storage";

// Shared handler factory for the per-user movie lists (favorites,
// watchlist). Every request follows the same pipeline:
//
//   request → verify session → derive user id → rate limit → validate → act
//
// The user id passed to the service always comes from the verified session.
// Any `userId` a client tries to send is rejected by the strict body schema
// (unknown keys fail validation) and could never be used anyway.

interface LibraryService {
  list: (userId: string) => Promise<StoredMovie[]>;
  add: (userId: string, movie: MovieSnapshot) => Promise<void>;
  remove: (userId: string, movieId: number) => Promise<void>;
}

export function createLibraryRoutes(listKey: "favorites" | "watchlist", service: LibraryService) {
  async function GET(request: NextRequest) {
    const auth = await requireRequestSession(request);
    if (auth.response) return auth.response;

    const limited = enforceRateLimit(request, "library-read", auth.session.userId);
    if (limited) return limited;

    const movies = await service.list(auth.session.userId);
    return NextResponse.json({ [listKey]: movies }, { headers: PRIVATE_NO_STORE });
  }

  async function POST(request: NextRequest) {
    const crossSite = rejectCrossSite(request);
    if (crossSite) return crossSite;

    const auth = await requireRequestSession(request);
    if (auth.response) return auth.response;

    const limited = enforceRateLimit(request, "library-write", auth.session.userId);
    if (limited) return limited;

    const body = await parseJsonBody(request, movieRefBodySchema);
    if (!body.ok) return body.response;

    try {
      const movie = await resolveMovieSnapshot(body.data.movieId);
      await service.add(auth.session.userId, movie);
      return NextResponse.json({ ok: true, movie }, { headers: PRIVATE_NO_STORE });
    } catch (error) {
      if (error instanceof MovieNotFoundError) return jsonError(404, "Movie not found.", PRIVATE_NO_STORE);
      return jsonError(502, "Couldn't save that right now — please try again.", PRIVATE_NO_STORE);
    }
  }

  async function DELETE(request: NextRequest) {
    const crossSite = rejectCrossSite(request);
    if (crossSite) return crossSite;

    const auth = await requireRequestSession(request);
    if (auth.response) return auth.response;

    const limited = enforceRateLimit(request, "library-write", auth.session.userId);
    if (limited) return limited;

    const body = await parseJsonBody(request, movieRefBodySchema);
    if (!body.ok) return body.response;

    await service.remove(auth.session.userId, body.data.movieId);
    return NextResponse.json({ ok: true }, { headers: PRIVATE_NO_STORE });
  }

  return { GET, POST, DELETE };
}
