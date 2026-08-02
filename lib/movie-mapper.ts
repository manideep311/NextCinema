import type { TmdbMovieWithExtras } from "@/services/tmdb";
import type { MovieProfile } from "@/types/movie";

const MAX_CAST_MEMBERS = 5;

function extractYear(releaseDate: string): string | null {
  return releaseDate ? releaseDate.slice(0, 4) : null;
}

function extractDirector(crew: TmdbMovieWithExtras["credits"]["crew"]): string | null {
  return crew.find((member) => member.job === "Director")?.name ?? null;
}

function extractTopCast(cast: TmdbMovieWithExtras["credits"]["cast"]): string[] {
  return [...cast]
    .sort((a, b) => a.order - b.order)
    .slice(0, MAX_CAST_MEMBERS)
    .map((member) => member.name);
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
    castNames: extractTopCast(data.credits.cast),
    director: extractDirector(data.credits.crew),
    popularity: data.popularity,
    voteAverage: data.vote_average,
  };
}