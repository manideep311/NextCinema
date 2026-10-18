import type { TmdbMovieWithExtras } from "@/services/tmdb";
import type { CreditedPerson, MovieProfile } from "@/types/movie";
import type { TmdbMovie } from "@/types/tmdb";

/** The minimal shape every movie card/grid renders. */
export type CardMovie = Pick<MovieProfile, "id" | "title" | "posterPath" | "voteAverage" | "releaseYear">;

export function toCardMovie(movie: TmdbMovie): CardMovie {
  return {
    id: movie.id,
    title: movie.title,
    posterPath: movie.poster_path,
    voteAverage: movie.vote_average,
    releaseYear: movie.release_date ? movie.release_date.slice(0, 4) : null,
  };
}

const MAX_CAST_MEMBERS = 5;

function extractYear(releaseDate: string): string | null {
  return releaseDate ? releaseDate.slice(0, 4) : null;
}

/** Every credited director, once each (TMDB occasionally lists a person twice). */
function extractDirectors(crew: TmdbMovieWithExtras["credits"]["crew"]): CreditedPerson[] {
  const seen = new Set<number>();
  const directors: CreditedPerson[] = [];
  for (const member of crew) {
    if (member.job !== "Director" || seen.has(member.id)) continue;
    seen.add(member.id);
    directors.push({ id: member.id, name: member.name });
  }
  return directors;
}

function extractTopCast(cast: TmdbMovieWithExtras["credits"]["cast"]): CreditedPerson[] {
  return [...cast]
    .sort((a, b) => a.order - b.order)
    .slice(0, MAX_CAST_MEMBERS)
    .map((member) => ({ id: member.id, name: member.name }));
}

/**
 * The single conversion point from "whatever shape TMDB gives us" to
 * "the flat shape our recommendation engine and UI actually consume."
 * If TMDB ever changes a field name, this is the only file that needs
 * to know about it.
 */
export function mapExtrasToProfile(data: TmdbMovieWithExtras): MovieProfile {
  return {
    id: data.id,
    title: data.title,
    posterPath: data.poster_path,
    releaseYear: extractYear(data.release_date),
    genreIds: data.genres.map((g) => g.id),
    genreNames: data.genres.map((g) => g.name),
    keywords: data.keywords.keywords.map((k) => k.name),
    cast: extractTopCast(data.credits.cast),
    directors: extractDirectors(data.credits.crew),
    popularity: data.popularity,
    voteAverage: data.vote_average,
    voteCount: data.vote_count,
  };
}