import type { Metadata } from "next";
import { WatchlistSection } from "@/components/features/dashboard/watchlist-section";

// Auth is enforced by middleware.ts for this route — no per-page redirect needed.
export const metadata: Metadata = { title: "Watchlist — NextCinema" };

export default function WatchlistPage() {
  return (
    <div>
      <h1 className="font-serif text-2xl mb-1">Watchlist</h1>
      <p className="text-muted mb-8">Movies you&apos;re planning to watch.</p>
      <WatchlistSection />
    </div>
  );
}
