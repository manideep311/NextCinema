import type { Metadata } from "next";
import { requirePageSession } from "@/lib/auth/session";
import { FavoritesSection } from "@/components/features/dashboard/favorites-section";

export const metadata: Metadata = { title: "Favorites — NextCinema" };

export default async function FavoritesPage() {
  // Enforced here, not just by proxy.ts. The list itself is already in the
  // shared LibraryProvider store (loaded once by the root layout).
  await requirePageSession("/dashboard/favorites");

  return (
    <div>
      <h1 className="font-serif text-2xl mb-1">Favorites</h1>
      <p className="text-muted mb-8">Movies you&apos;ve saved.</p>
      <FavoritesSection />
    </div>
  );
}
