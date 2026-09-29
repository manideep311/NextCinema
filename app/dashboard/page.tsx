import { Suspense } from "react";
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth/session";
import { INDUSTRIES, isPrimaryIndustryId, DEFAULT_PRIMARY_INDUSTRY } from "@/lib/industries";
import { hourInTimeZone, TIMEZONE_COOKIE } from "@/lib/time-of-day";
import { getIndustryCollections } from "@/services/discovery";
import { OverviewHero } from "@/components/features/dashboard/overview-hero";
import { IndustryCollections } from "@/components/features/dashboard/industry-collections";
import { ForYouSection, ForYouSectionSkeleton } from "@/components/features/dashboard/for-you-section";
import { ContinueYourJourneySection } from "@/components/features/dashboard/continue-your-journey-section";

interface DashboardOverviewProps {
  searchParams: Promise<{ industry?: string }>;
}

/** The viewer's current hour from their saved (untrusted, so validated) time-zone cookie. */
function savedZoneHour(value: string | undefined): number | null {
  if (!value) return null;
  try {
    return hourInTimeZone(decodeURIComponent(value));
  } catch {
    return null;
  }
}

/**
 * The Overview is NextCinema's primary discovery surface: pick an
 * industry, get a curated set of collections for it. The selected
 * industry is resolved here (from the URL, defaulting to Hollywood) so a
 * direct link or a refresh renders the right industry on first paint.
 * The personalized sections below stream in via Suspense, so they never
 * hold up the industry collections.
 */
export default async function DashboardOverview({ searchParams }: DashboardOverviewProps) {
  const { industry: requestedIndustry } = await searchParams;
  const initialIndustry = isPrimaryIndustryId(requestedIndustry) ? requestedIndustry : DEFAULT_PRIMARY_INDUSTRY;
  const languageCode = INDUSTRIES.find((industry) => industry.id === initialIndustry)!.language!;

  const [session, initialCollections, cookieStore] = await Promise.all([
    getSession(),
    getIndustryCollections(languageCode),
    cookies(),
  ]);

  // Viewer's own time zone when we've seen it before; server clock only on a first visit
  // (the client corrects that immediately — see OverviewHero).
  const serverHour = savedZoneHour(cookieStore.get(TIMEZONE_COOKIE)?.value) ?? new Date().getHours();

  return (
    <div>
      <OverviewHero firstName={session ? session.name.split(" ")[0] : null} serverHour={serverHour} />

      <IndustryCollections initialIndustry={initialIndustry} initialCollections={initialCollections} />

      {session && (
        <>
          <Suspense fallback={<ForYouSectionSkeleton />}>
            <ForYouSection userId={session.userId} />
          </Suspense>
          <Suspense fallback={null}>
            <ContinueYourJourneySection userId={session.userId} />
          </Suspense>
        </>
      )}
    </div>
  );
}
