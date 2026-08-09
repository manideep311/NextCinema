import type { Metadata } from "next";
import { FavoritesSection } from "@/components/features/dashboard/favorites-section";

// Auth is enforced by middleware.ts for this route — no per-page redirect needed.
export const metadata: Metadata = { title: "Favorites — NextCinema" };

export default function FavoritesPage() {
  return (
    <div>
      <h1 className="font-serif text-2xl mb-1">Favorites</h1>
      <p className="text-muted mb-8">Movies you&apos;ve saved.</p>
      <FavoritesSection />
    </div>
  );
}
