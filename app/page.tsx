import { getTrendingMovies } from "@/services/tmdb";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Hero } from "@/components/features/landing/hero";
import { FeatureCards } from "@/components/features/landing/feature-cards";
import { AiPreview } from "@/components/features/landing/ai-preview";
import { Testimonials } from "@/components/features/landing/testimonials";
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
      <FeatureCards />
      <AiPreview />
      <Testimonials />
      <Cta />
      <Footer />
    </>
  );
}