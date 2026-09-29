import { discoverMovies, getTrendingMovies, TMDB_CACHE } from "@/services/tmdb";
import { WEIGHTS } from "@/lib/recommendation-engine";
import { SUPPORTED_SEARCH_LANGUAGES } from "@/lib/search/interpret";
import { JOURNEY_TYPE_LABELS } from "@/lib/journeys/definitions";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Hero } from "@/components/features/landing/hero";
import { TrustedBy } from "@/components/features/landing/trusted-by";
import { StatsSection, type LandingStat } from "@/components/features/landing/stats-section";
import { RecommendationShowcase } from "@/components/features/landing/recommendation-showcase";
import { FeatureCards } from "@/components/features/landing/feature-cards";
import { HowItWorks } from "@/components/features/landing/how-it-works";
import { Testimonials } from "@/components/features/landing/testimonials";
import { Faq } from "@/components/features/landing/faq";
import { Cta } from "@/components/features/landing/cta";

/** Real, verifiable numbers only: TMDB's live catalog size and the app's own configuration. */
async function getLandingStats(): Promise<LandingStat[]> {
  const catalogSize = await discoverMovies({ sort_by: "popularity.desc" }, TMDB_CACHE.resolution)
    .then((page) => page.total_results)
    .catch(() => null);

  const stats: LandingStat[] = [
    ...(catalogSize ? [{ label: "Movies to explore", value: catalogSize, suffix: "+" }] : []),
    { label: "Film languages search understands", value: SUPPORTED_SEARCH_LANGUAGES, suffix: "" },
    { label: "Kinds of movie journeys", value: Object.keys(JOURNEY_TYPE_LABELS).length, suffix: "" },
    { label: "Signals behind every match", value: Object.keys(WEIGHTS).length, suffix: "" },
    { label: "Watch orders for franchises", value: 3, suffix: "" },
  ];
  return stats.slice(0, 4);
}

export default async function Home() {
  // The landing page must render even if TMDB is briefly unreachable — the hero just shows no posters.
  const [trending, stats] = await Promise.all([getTrendingMovies().catch(() => null), getLandingStats()]);

  const featuredMovies = (trending?.results ?? []).slice(0, 5).map((movie) => ({
    id: movie.id,
    title: movie.title,
    posterPath: movie.poster_path,
  }));

  return (
    <>
      <Navbar />
      <Hero featuredMovies={featuredMovies} />
      <TrustedBy />
      <StatsSection stats={stats} />
      <RecommendationShowcase />
      <FeatureCards />
      <HowItWorks />
      <Testimonials />
      <Faq />
      <Cta />
      <Footer />
    </>
  );
}
