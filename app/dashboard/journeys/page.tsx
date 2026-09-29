import { getSession } from "@/lib/auth/session";
import { listJourneyCards } from "@/services/journeys";
import { JourneyGrid } from "@/components/features/journeys/journey-grid";
import { FadeIn } from "@/components/motion/fade-in";

export const metadata = {
  title: "Movie Journeys — NextCinema",
};

export default async function JourneysPage() {
  const session = await getSession();
  // Every journey that currently meets its quality threshold (cached catalog)
  // + this user's watched counts from a single query.
  const journeys = await listJourneyCards(session?.userId ?? null);

  return (
    <div>
      <FadeIn>
        <h1 className="font-serif text-3xl mb-1">Movie Journeys</h1>
        <p className="text-muted mb-10 max-w-xl">
          Follow the stories you love, one movie at a time.
        </p>
      </FadeIn>

      <JourneyGrid journeys={journeys} />
    </div>
  );
}
