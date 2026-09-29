import type { Metadata } from "next";
import { ContinueWatchingSection } from "@/components/features/dashboard/continue-watching-section";
import { requirePageSession } from "@/lib/auth/session";
import { listWatchHistory } from "@/services/watch-history";

export const metadata: Metadata = { title: "Recently Viewed — NextCinema" };

export default async function RecentPage() {
  // The page enforces its own session check — proxy.ts's redirect is only a UX shortcut.
  const session = await requirePageSession("/dashboard/recent");
  const movies = await listWatchHistory(session.userId);

  return (
    <div>
      <h1 className="font-serif text-2xl mb-1">Recently Viewed</h1>
      <p className="text-muted mb-8">Movies you&apos;ve recently looked at.</p>
      <ContinueWatchingSection movies={movies} />
    </div>
  );
}
