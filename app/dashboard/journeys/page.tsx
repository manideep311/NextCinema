import { getSession } from "@/lib/auth/session";
import { listJourneyDefs, getJourneyCardPreview } from "@/services/journeys";
import { JourneyGrid } from "@/components/features/journeys/journey-grid";
import { FadeIn } from "@/components/motion/fade-in";

export const metadata = {
  title: "Movie Journeys — NextCinema",
};

export default async function JourneysPage() {
  const session = await getSession();
  const userId = session?.userId ?? null;

  const journeys = await Promise.all(
    listJourneyDefs().map((journey) => getJourneyCardPreview(journey, userId))
  );

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
