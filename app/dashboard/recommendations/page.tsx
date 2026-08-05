import type { Metadata } from "next";
import { ForYouSection } from "@/components/features/dashboard/for-you-section";

// Auth is enforced by middleware.ts for this route — no per-page redirect needed.
export const metadata: Metadata = { title: "Recommendations — NextCinema" };

export default function RecommendationsPage() {
  return (
    <div>
      <h1 className="font-heading text-2xl font-bold mb-1">Recommendations</h1>
      <p className="text-muted mb-8">Your full AI-matched picks, explained.</p>
      <ForYouSection limit={20} />
    </div>
  );
}
