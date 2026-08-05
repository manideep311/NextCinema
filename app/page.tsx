import { getTrendingMovies } from "@/services/tmdb";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Hero } from "@/components/features/landing/hero";
import { TrustedBy } from "@/components/features/landing/trusted-by";
import { StatsSection } from "@/components/features/landing/stats-section";
import { RecommendationShowcase } from "@/components/features/landing/recommendation-showcase";
import { FeatureCards } from "@/components/features/landing/feature-cards";
import { HowItWorks } from "@/components/features/landing/how-it-works";
import { Testimonials } from "@/components/features/landing/testimonials";
import { Faq } from "@/components/features/landing/faq";
import { Cta } from "@/components/features/landing/cta";

export default async function Home() {
  const trending = await getTrendingMovies();

  const featuredMovies = trending.results.slice(0, 5).map((movie) => ({
    id: movie.id,
    title: movie.title,
    posterPath: movie.poster_path,
  }));

  return (
    <>
      <Navbar />
      <Hero featuredMovies={featuredMovies} />
      <TrustedBy />
      <StatsSection />
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
