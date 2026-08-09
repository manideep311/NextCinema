import Link from "next/link";
import { Compass } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { listWatchHistory } from "@/services/watch-history";
import { pickActiveJourney, getJourneyDetail } from "@/services/journeys";
import { DashboardContinueJourney } from "@/components/features/journeys/continue-journey";
import { DashboardSection } from "@/components/features/dashboard/dashboard-section";

/**
 * Account-only, same gating as For You/Continue Watching — a signed-out
 * visitor has no watch history to build a journey position from anyway.
 * "Active" journey is picked from the user's own recent history (see
 * services/journeys.ts#pickActiveJourney); if none of their watches
 * overlap a known journey, this shows an honest "discover" prompt rather
 * than fabricating progress.
 */
export async function ContinueYourJourneySection() {
  const session = await getSession();
  if (!session) return null;

  const recentHistory = await listWatchHistory(session.userId);
  const activeJourney = pickActiveJourney(recentHistory);

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

  const detail = await getJourneyDetail(activeJourney, "release", session.userId);

  return (
    <DashboardSection title="Your Next Chapter">
      <DashboardContinueJourney
        journeyId={activeJourney.id}
        journeyName={activeJourney.name}
        movies={detail.releaseOrderMovies}
        progress={detail.progress}
      />
    </DashboardSection>
  );
}
