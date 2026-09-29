import { NextResponse, type NextRequest } from "next/server";
import { requireRequestSession } from "@/lib/auth/session";
import { enforceRateLimit, jsonError, PRIVATE_NO_STORE } from "@/lib/http";
import { limitParamSchema, parseOptionalParam } from "@/lib/validation";
import { getForYou } from "@/services/for-you";
import { MAX_RECOMMENDATIONS } from "@/services/recommendations";

/**
 * Personalized picks (used by the assistant; the dashboard pages render
 * the same data server-side). Account-only, seeded from the *session*
 * user's own favorites. The heavy per-movie scoring underneath is a shared
 * public cache, so this is cheap after the first call.
 */
export async function GET(request: NextRequest) {
  const auth = await requireRequestSession(request);
  if (auth.response) return auth.response;

  const limited = enforceRateLimit(request, "recommendations", auth.session.userId);
  if (limited) return limited;

  const limit = parseOptionalParam(request.nextUrl.searchParams.get("limit"), limitParamSchema(MAX_RECOMMENDATIONS), 10);
  if (!limit.ok) return jsonError(400, limit.error, PRIVATE_NO_STORE);

  try {
    const result = await getForYou(auth.session.userId, limit.value);
    return NextResponse.json(
      { basis: result.basis, basedOnTitle: result.basedOn?.title ?? null, movies: result.movies },
      { headers: PRIVATE_NO_STORE }
    );
  } catch {
    return jsonError(502, "Couldn't load recommendations right now.", PRIVATE_NO_STORE);
  }
}
