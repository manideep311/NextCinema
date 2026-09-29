import { NextResponse, type NextRequest } from "next/server";
import { INDUSTRIES, isPrimaryIndustryId } from "@/lib/industries";
import { getIndustryCollections } from "@/services/discovery";
import { enforceRateLimit, jsonError } from "@/lib/http";

/**
 * Powers the Overview's industry collections (Hidden Gems, Top Rated,
 * Trending Now, Under the Radar, New Releases). One request per industry
 * switch, and only for the five industries the selector offers.
 */
export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, "tmdb-proxy");
  if (limited) return limited;

  const requested = request.nextUrl.searchParams.get("industry");
  if (!isPrimaryIndustryId(requested)) return jsonError(400, "Unknown industry.");

  const config = INDUSTRIES.find((industry) => industry.id === requested);
  if (!config?.language) return jsonError(400, "Unknown industry.");

  const collections = await getIndustryCollections(config.language);
  return NextResponse.json(
    { industry: requested, collections },
    { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=600" } }
  );
}
