import type { Metadata } from "next";
import { requirePageSession } from "@/lib/auth/session";
import { WatchlistSection } from "@/components/features/dashboard/watchlist-section";

export const metadata: Metadata = { title: "Watchlist — NextCinema" };

export default async function WatchlistPage() {
  // Enforced here, not just by proxy.ts. The list itself is already in the
  // shared LibraryProvider store (loaded once by the root layout).
  await requirePageSession("/dashboard/watchlist");

  return (
    <div>
      <h1 className="font-serif text-2xl mb-1">Watchlist</h1>
      <p className="text-muted mb-8">Movies you&apos;re planning to watch.</p>
      <WatchlistSection />
    </div>
  );
}
