import type { Metadata } from "next";
import { ContinueWatchingSection } from "@/components/features/dashboard/continue-watching-section";

export const metadata: Metadata = { title: "Recently Viewed — NextCinema" };

export default function RecentPage() {
  return (
    <div>
      <h1 className="font-heading text-2xl font-bold mb-1">Recently Viewed</h1>
      <p className="text-muted mb-8">Movies you&apos;ve recently looked at.</p>
      <ContinueWatchingSection />
    </div>
  );
}
