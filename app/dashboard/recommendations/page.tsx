import type { Metadata } from "next";
import { Suspense } from "react";
import { ForYouSection, ForYouSectionSkeleton } from "@/components/features/dashboard/for-you-section";
import { requirePageSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Recommendations — NextCinema" };

export default async function RecommendationsPage() {
  const session = await requirePageSession("/dashboard/recommendations");

  return (
    <div>
      <h1 className="font-serif text-2xl mb-1">For You</h1>
      <p className="text-muted mb-8">Your full set of picks, explained.</p>
      {/* The full 20 (the Overview shows the top 10) — served from the same cached per-movie computation. */}
      <Suspense fallback={<ForYouSectionSkeleton count={20} />}>
        <ForYouSection userId={session.userId} limit={20} />
      </Suspense>
    </div>
  );
}
