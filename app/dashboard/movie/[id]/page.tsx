import { notFound } from "next/navigation";
import { getMovieWithExtras, getSimilarMovies } from "@/services/tmdb";
import { mapExtrasToProfile } from "@/lib/movie-mapper";
import { recommendMovies } from "@/lib/recommendation-engine";
import { mapExtrasToProfile as mapCandidate } from "@/lib/movie-mapper";
import { MovieHero } from "@/components/features/movie-details/movie-hero";
import { CastList } from "@/components/features/movie-details/cast-list";
import { TrailerEmbed } from "@/components/features/movie-details/trailer-embed";
import { MovieGrid } from "@/components/features/movies/movie-grid";
import { TmdbApiError } from "@/lib/tmdb-client";
import { getMovieVideos } from "@/services/tmdb";

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

  const [similarPage, videosResponse] = await Promise.all([
    getSimilarMovies(movieId),
    getMovieVideos(movieId),
  ]);
  const candidateProfiles = await Promise.all(
    similarPage.results
      .slice(0, MAX_SIMILAR_CANDIDATES)
      .map((m) => getMovieWithExtras(m.id).then(mapCandidate))
  );
  const similarMovies = recommendMovies(profile, candidateProfiles, SIMILAR_MOVIES_COUNT);

  const matchScores = Object.fromEntries(
    similarMovies.map((s) => [s.movie.id, s.score])
  );

  return (
    <div>
      <MovieHero
        movie={profile}
        backdropPath={movieData.backdrop_path}
        tagline={movieData.tagline}
        runtime={movieData.runtime}
      />

      <div className="px-4 md:px-8 space-y-10">
        <div>
          <h2 className="font-heading text-lg font-semibold mb-3">Overview</h2>
          <p className="text-muted leading-relaxed max-w-3xl">{profile.title && movieData.overview}</p>
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
          <h2 className="font-heading text-lg font-semibold mb-3">Similar Movies</h2>
          <MovieGrid
            movies={similarMovies.map((s) => s.movie)}
            matchScores={matchScores}
          />
        </div>
      </div>
    </div>
  );
}