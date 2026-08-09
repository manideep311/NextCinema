import { getSession } from "@/lib/auth/session";
import { INDUSTRIES, isPrimaryIndustryId, DEFAULT_PRIMARY_INDUSTRY } from "@/lib/industries";
import { getIndustryCollections } from "@/services/discovery";
import { OverviewHero } from "@/components/features/dashboard/overview-hero";
import { IndustryCollections } from "@/components/features/dashboard/industry-collections";
import { ForYouSection } from "@/components/features/dashboard/for-you-section";
import { ContinueYourJourneySection } from "@/components/features/dashboard/continue-your-journey-section";

interface DashboardOverviewProps {
  searchParams: Promise<{ industry?: string }>;
}

function timeOfDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/**
 * The Overview is NextCinema's primary discovery surface: pick an
 * industry, get a curated set of collections for it. The selected
 * industry is resolved here (from the URL, defaulting to Hollywood — see
 * lib/industries.ts) so a direct link or a refresh always renders the
 * right industry's movies on the very first paint, with zero client
 * round-trip. IndustryCollections (client) takes over from there for any
 * in-session switching.
 */
export default async function DashboardOverview({ searchParams }: DashboardOverviewProps) {
  const { industry: requestedIndustry } = await searchParams;
  const initialIndustry = isPrimaryIndustryId(requestedIndustry) ? requestedIndustry : DEFAULT_PRIMARY_INDUSTRY;
  const languageCode = INDUSTRIES.find((industry) => industry.id === initialIndustry)!.language!;

  const [session, initialCollections] = await Promise.all([
    getSession(),
    getIndustryCollections(languageCode),
  ]);

  const greeting = session ? `${timeOfDayGreeting()}, ${session.name.split(" ")[0]}.` : `${timeOfDayGreeting()}.`;

  return (
    <div>
      <OverviewHero greeting={greeting} />

      <IndustryCollections initialIndustry={initialIndustry} initialCollections={initialCollections} />

      {session && (
        <>
          <ForYouSection />
          <ContinueYourJourneySection />
        </>
      )}
    </div>
  );
}
