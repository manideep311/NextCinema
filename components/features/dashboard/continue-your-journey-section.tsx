import Link from "next/link";
import { Compass } from "lucide-react";
import { getActiveJourney } from "@/services/journeys";
import { DashboardContinueJourney } from "@/components/features/journeys/continue-journey";
import { DashboardSection } from "@/components/features/dashboard/dashboard-section";

/**
 * Account-only. The featured journey is the one the user most recently
 * marked a movie watched in (an explicit "watched" record — merely opening
 * movie pages never counts). With no journey activity yet, this shows an
 * honest "discover" prompt rather than fabricating progress.
 */
export async function ContinueYourJourneySection({ userId }: { userId: string }) {
  const activeJourney = await getActiveJourney(userId).catch(() => null);

  if (!activeJourney) {
    return (
      <DashboardSection title="Your Next Chapter">
        <div className="border border-dashed border-white/10 rounded-lg py-10 px-6 flex flex-col items-center text-center">
          <p className="text-muted text-sm max-w-xs mb-4">Follow a movie universe from beginning to end.</p>
          <Link
            href="/dashboard/journeys"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            <Compass className="size-4" /> Explore Journeys
          </Link>
        </div>
      </DashboardSection>
    );
  }

  return (
    <DashboardSection title="Your Next Chapter">
      <DashboardContinueJourney
        journeyId={activeJourney.id}
        journeyName={activeJourney.name}
        movies={activeJourney.releaseOrderMovies}
        progress={activeJourney.progress}
      />
    </DashboardSection>
  );
}
