import { notFound } from "next/navigation";
import { getMovieWithExtras, getSimilarMovies, getMovieVideos, getWatchProviders } from "@/services/tmdb";
import { mapExtrasToProfile } from "@/lib/movie-mapper";
import { recommendMovies } from "@/lib/recommendation-engine";
import { MovieHero } from "@/components/features/movie-details/movie-hero";
import { CastList } from "@/components/features/movie-details/cast-list";
import { TrailerEmbed } from "@/components/features/movie-details/trailer-embed";
import { MovieFacts } from "@/components/features/movie-details/movie-facts";
import { AiSummary } from "@/components/features/movie-details/ai-summary";
import { SimilarMovies } from "@/components/features/movie-details/similar-movies";
import { WatchProviders, hasWatchProviders } from "@/components/features/movie-details/watch-providers";
import { RecordView } from "@/components/features/movie-details/record-view";
import { TmdbApiError } from "@/lib/tmdb-client";

interface MovieDetailsPageProps {
  params: Promise<{ id: string }>;
}

const MAX_SIMILAR_CANDIDATES = 12;
const SIMILAR_MOVIES_COUNT = 5;

export default async function MovieDetailsPage({ params }: MovieDetailsPageProps) {
  const { id } = await params;
  const movieId = Number(id);

  if (!Number.isInteger(movieId) || movieId <= 0) {
    notFound();
  }

  let movieData;
  try {
    movieData = await getMovieWithExtras(movieId);
  } catch (error) {
    if (error instanceof TmdbApiError && error.status === 404) {
      notFound();
    }
    throw error;
  }

  const profile = mapExtrasToProfile(movieData);

  // Everything below is secondary content — trailer, similar movies, watch
  // providers — none of it should be able to take down the whole page if
  // TMDB drops a connection on one of these calls. Each one degrades to an
  // empty/null result instead of throwing.
  const [similarPage, videosResponse, watchProviders] = await Promise.all([
    getSimilarMovies(movieId).catch(() => ({ page: 1, results: [], total_pages: 0, total_results: 0 })),
    getMovieVideos(movieId).catch(() => ({ results: [] })),
    getWatchProviders(movieId).catch(() => null),
  ]);
  const watchRegion = watchProviders?.results?.IN;

  // Fetching full profiles for up to a dozen similar-movie candidates is
  // the single biggest source of concurrent TMDB requests on this page —
  // allSettled means one or two dropped connections just shrink the
  // candidate pool instead of 500ing the entire page.
  const candidateResults = await Promise.allSettled(
    similarPage.results
      .slice(0, MAX_SIMILAR_CANDIDATES)
      .map((m) => getMovieWithExtras(m.id).then(mapExtrasToProfile))
  );
  const candidateProfiles = candidateResults
    .filter((r): r is PromiseFulfilledResult<ReturnType<typeof mapExtrasToProfile>> => r.status === "fulfilled")
    .map((r) => r.value);
  const similarMovies = recommendMovies(profile, candidateProfiles, SIMILAR_MOVIES_COUNT);

  return (
    <div>
      <RecordView
        movie={{
          id: profile.id,
          title: profile.title,
          posterPath: profile.posterPath,
          voteAverage: profile.voteAverage,
          releaseYear: profile.releaseYear,
        }}
      />

      <MovieHero
        movie={profile}
        backdropPath={movieData.backdrop_path}
        tagline={movieData.tagline}
        runtime={movieData.runtime}
      />

      <div className="px-4 md:px-8 space-y-10">
        {hasWatchProviders(watchRegion) && (
          <div>
            <h2 className="font-heading text-lg font-semibold mb-3">Where to Watch</h2>
            <WatchProviders region={watchRegion} movieTitle={profile.title} />
          </div>
        )}

        <div>
          <h2 className="font-heading text-lg font-semibold mb-3">Overview</h2>
          <p className="text-muted leading-relaxed max-w-3xl mb-4">{movieData.overview}</p>
          <AiSummary movie={profile} />
        </div>

        <div>
          <h2 className="font-heading text-lg font-semibold mb-3">Cast</h2>
          <CastList cast={movieData.credits.cast} />
        </div>

        <div>
          <h2 className="font-heading text-lg font-semibold mb-3">Trailer</h2>
          <TrailerEmbed videos={videosResponse.results} />
        </div>

        <div>
          <h2 className="font-heading text-lg font-semibold mb-3">Movie Facts</h2>
          <MovieFacts
            budget={movieData.budget}
            revenue={movieData.revenue}
            status={movieData.status}
            productionCompanies={movieData.production_companies}
            spokenLanguages={movieData.spoken_languages}
          />
        </div>

        <div>
          <h2 className="font-heading text-lg font-semibold mb-3">Similar Movies</h2>
          <p className="text-muted text-sm mb-4">Ranked and explained by NextCinema, not just TMDB's raw list.</p>
          <SimilarMovies recommendations={similarMovies} />
        </div>
      </div>
    </div>
  );
}
