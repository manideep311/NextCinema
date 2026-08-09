import { NextResponse } from "next/server";
import { INDUSTRIES, isPrimaryIndustryId } from "@/lib/industries";
import { getIndustryCollections } from "@/services/discovery";

/**
 * Powers the Overview's industry collections (Hidden Gems, Top Rated,
 * Trending Now, Under the Radar, New Releases). One request per industry
 * switch — never all five industries at once — and the derivation logic
 * lives once in services/discovery.ts rather than being duplicated across
 * components.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requested = searchParams.get("industry");

  // Never trust client input directly — only ever resolve against the five
  // industries the Overview's selector actually offers.
  if (!isPrimaryIndustryId(requested)) {
    return NextResponse.json({ error: "Unknown industry" }, { status: 400 });
  }

  const config = INDUSTRIES.find((industry) => industry.id === requested);
  if (!config?.language) {
    // Defense in depth — every PRIMARY_INDUSTRY_ID is guaranteed to have a
    // language in lib/industries.ts, so this should be unreachable.
    return NextResponse.json({ error: "Unknown industry" }, { status: 400 });
  }

  const collections = await getIndustryCollections(config.language);
  return NextResponse.json({ industry: requested, collections });
}
