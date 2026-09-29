import { Suspense } from "react";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getMovieWithExtras, getMovieVideos, getWatchProviders } from "@/services/tmdb";
import { getRecommendationsForMovie } from "@/services/recommendations";
import { findJourneyForMovie, getJourneyDetail } from "@/services/journeys";
import { mapExtrasToProfile } from "@/lib/movie-mapper";
import { getSession } from "@/lib/auth/session";
import { movieIdParamSchema } from "@/lib/validation";
import { resolveWatchRegion } from "@/lib/region";
import { MovieHero } from "@/components/features/movie-details/movie-hero";
import { CastList } from "@/components/features/movie-details/cast-list";
import { TrailerEmbed } from "@/components/features/movie-details/trailer-embed";
import { hasTrailer } from "@/lib/movie-details/trailer";
import { MovieFacts, hasMovieFacts } from "@/components/features/movie-details/movie-facts";
import { AiSummary } from "@/components/features/movie-details/ai-summary";
import { SimilarMovies } from "@/components/features/movie-details/similar-movies";
import { WatchProviders, hasWatchProviders } from "@/components/features/movie-details/watch-providers";
import { RecordView } from "@/components/features/movie-details/record-view";
import { MovieDetailContinueJourney } from "@/components/features/journeys/continue-journey";
import { TmdbApiError } from "@/lib/tmdb-client";
import type { TmdbMovieWithExtras } from "@/services/tmdb";

interface MovieDetailsPageProps {
  params: Promise<{ id: string }>;
}

const SIMILAR_MOVIES_COUNT = 5;

/** Streams in after the main content: ranked + explained, from the shared per-movie recommendation cache. */
async function SimilarMoviesSection({ movieId }: { movieId: number }) {
  const recommendations = await getRecommendationsForMovie(movieId).catch(() => []);
  const similar = recommendations.slice(0, SIMILAR_MOVIES_COUNT);
  if (similar.length === 0) return null;

  return (
    <div>
      <h2 className="font-serif text-xl mb-3">Similar Movies</h2>
      <p className="text-muted text-sm mb-4">Ranked and explained by NextCinema, not just TMDB&apos;s raw list.</p>
      <SimilarMovies recommendations={similar} />
    </div>
  );
}

/** The franchise journey this movie belongs to, if any — streamed so it never delays the page. */
async function JourneySection({ movie }: { movie: TmdbMovieWithExtras }) {
  const journey = await findJourneyForMovie({
    id: movie.id,
    title: movie.title,
    collectionId: movie.belongs_to_collection?.id ?? null,
    collectionName: movie.belongs_to_collection?.name ?? null,
    keywords: movie.keywords.keywords.map((keyword) => keyword.name),
  }).catch(() => null);
  if (!journey) return null;

  const session = await getSession();
  const detail = await getJourneyDetail(journey.id, "release", session?.userId ?? null).catch(() => null);
  if (!detail) return null;

  return (
    <MovieDetailContinueJourney
      journeyId={detail.id}
      journeyName={detail.name}
      movies={detail.releaseOrderMovies}
      currentMovieId={movie.id}
    />
  );
}

export default async function MovieDetailsPage({ params }: MovieDetailsPageProps) {
  const { id } = await params;
  const parsedId = movieIdParamSchema.safeParse(id);
  if (!parsedId.success) notFound();
  const movieId = parsedId.data;

  let movieData: TmdbMovieWithExtras;
  try {
    movieData = await getMovieWithExtras(movieId);
  } catch (error) {
    if (error instanceof TmdbApiError && error.status === 404) notFound();
    throw error;
  }
  if (movieData.adult) notFound();

  const profile = mapExtrasToProfile(movieData);

  // Secondary content degrades to "nothing" instead of failing the page if TMDB drops a connection.
  const [videosResponse, watchProviders, requestHeaders] = await Promise.all([
    getMovieVideos(movieId).catch(() => ({ results: [] })),
    getWatchProviders(movieId).catch(() => null),
    headers(),
  ]);
  const watchRegion = watchProviders?.results?.[resolveWatchRegion(requestHeaders)];

  return (
    <div>
      <RecordView movieId={profile.id} />

      <MovieHero
        movie={profile}
        backdropPath={movieData.backdrop_path}
        tagline={movieData.tagline}
        runtime={movieData.runtime}
      />

      <div className="px-4 md:px-8 space-y-14 max-w-5xl">
        <Suspense fallback={null}>
          <JourneySection movie={movieData} />
        </Suspense>

        {hasWatchProviders(watchRegion) && (
          <div>
            <h2 className="font-serif text-xl mb-3">Where to Watch</h2>
            <WatchProviders region={watchRegion} movieTitle={profile.title} />
          </div>
        )}

        <div>
          <h2 className="font-serif text-xl mb-3">Overview</h2>
          <p className="text-muted leading-relaxed max-w-3xl mb-4">{movieData.overview}</p>
          <AiSummary movie={profile} />
        </div>

        {movieData.credits.cast.length > 0 && (
          <div>
            <h2 className="font-serif text-xl mb-3">Cast</h2>
            <CastList cast={movieData.credits.cast} />
          </div>
        )}

        {hasTrailer(videosResponse.results) && (
          <div>
            <h2 className="font-serif text-xl mb-3">Trailer</h2>
            <TrailerEmbed videos={videosResponse.results} />
          </div>
        )}

        {hasMovieFacts({
          budget: movieData.budget,
          revenue: movieData.revenue,
          status: movieData.status,
          productionCompanies: movieData.production_companies,
          spokenLanguages: movieData.spoken_languages,
        }) && (
          <div>
            <h2 className="font-serif text-xl mb-3">Movie Facts</h2>
            <MovieFacts
              budget={movieData.budget}
              revenue={movieData.revenue}
              status={movieData.status}
              productionCompanies={movieData.production_companies}
              spokenLanguages={movieData.spoken_languages}
            />
          </div>
        )}

        <Suspense fallback={null}>
          <SimilarMoviesSection movieId={movieId} />
        </Suspense>
      </div>
    </div>
  );
}
