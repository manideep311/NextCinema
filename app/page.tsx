import { Suspense } from "react";
import { getTrendingMovies } from "@/services/tmdb";
import { WEIGHTS } from "@/lib/recommendation-engine";
import { SUPPORTED_SEARCH_LANGUAGES } from "@/lib/search/interpret";
import { JOURNEY_TYPE_LABELS } from "@/lib/journeys/definitions";
import { FRANCHISE_JOURNEYS } from "@/lib/journeys/definitions/franchises";
import { Navbar } from "@/components/layout/navbar";
import { Hero } from "@/components/features/landing/hero";
import { StatsSection, type LandingStat } from "@/components/features/landing/stats-section";
import { LiveShowcase } from "@/components/features/landing/live-showcase";
import { FeatureCards } from "@/components/features/landing/feature-cards";
import { HowItWorks } from "@/components/features/landing/how-it-works";
import { Faq } from "@/components/features/landing/faq";
import { Cta } from "@/components/features/landing/cta";

/**
 * Real, verifiable numbers only — each one is counted from the app's own
 * configuration, so it can't drift from what the product actually does.
 */
function getLandingStats(): LandingStat[] {
  return [
    { label: "Franchise watch guides", value: FRANCHISE_JOURNEYS.length, suffix: "" },
    { label: "Signals behind every match", value: Object.keys(WEIGHTS).length, suffix: "" },
    { label: "Film languages search understands", value: SUPPORTED_SEARCH_LANGUAGES, suffix: "" },
    { label: "Kinds of movie journeys", value: Object.keys(JOURNEY_TYPE_LABELS).length, suffix: "" },
  ];
}

export default async function Home() {
  // The landing page must render even if TMDB is briefly unreachable — the hero just shows no posters.
  const trending = await getTrendingMovies().catch(() => null);
  const stats = getLandingStats();

  const featuredMovies = (trending?.results ?? []).slice(0, 5).map((movie) => ({
    id: movie.id,
    title: movie.title,
    posterPath: movie.poster_path,
  }));

  return (
    <>
      <Navbar />
      <Hero featuredMovies={featuredMovies} />
      <StatsSection stats={stats} />
      <Suspense fallback={null}>
        <LiveShowcase />
      </Suspense>
      <FeatureCards />
      <HowItWorks />
      <Faq />
      <Cta />
    </>
  );
}
