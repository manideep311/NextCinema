import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getForYouRecommendations } from "@/services/for-you";

/** Account-only — mirrors the UI, which never shows "For You" to guests. */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ basedOnTitle: null, movies: [] }, { status: 401 });
  }

  const { movies, basedOnTitle } = await getForYouRecommendations(session.userId, 10);

  return NextResponse.json({
    basedOnTitle,
    movies: movies.map((s) => ({ ...s.movie, matchScore: s.score, reasons: s.reasons })),
  });
}
