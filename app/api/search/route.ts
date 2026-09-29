import { NextResponse, type NextRequest } from "next/server";
import { enforceRateLimit, jsonError } from "@/lib/http";
import { searchQuerySchema } from "@/lib/validation";
import { runSearch } from "@/services/search";

/**
 * Deterministic search (title, mood/genre, decade, language, similarity,
 * person, franchise journeys — see lib/search/interpret.ts). Public and
 * guest-accessible; rate-limited per IP; query length is bounded.
 */
export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, "search");
  if (limited) return limited;

  const raw = request.nextUrl.searchParams.get("q") ?? "";
  if (raw.trim().length < 2) {
    return NextResponse.json({ results: [], mode: "title", label: null, journeys: [] });
  }
  const parsed = searchQuerySchema.safeParse(raw);
  if (!parsed.success) return jsonError(400, parsed.error.issues[0]?.message ?? "Invalid search query.");

  try {
    const response = await runSearch(parsed.data);
    return NextResponse.json(response, { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } });
  } catch {
    return jsonError(502, "Search is unavailable right now — please try again.");
  }
}
