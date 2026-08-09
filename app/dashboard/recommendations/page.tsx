import type { Metadata } from "next";
import { ForYouSection } from "@/components/features/dashboard/for-you-section";

// Auth is enforced by middleware.ts for this route — no per-page redirect needed.
export const metadata: Metadata = { title: "Recommendations — NextCinema" };

export default function RecommendationsPage() {
  return (
    <div>
      <h1 className="font-serif text-2xl mb-1">For You</h1>
      <p className="text-muted mb-8">Your full set of picks, explained.</p>
      <ForYouSection limit={20} />
    </div>
  );
}
