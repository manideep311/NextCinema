import type { MovieProfile } from "@/types/movie";

/**
 * A short synthesized note built from the movie's own profile data
 * (genres, director, top cast) — cheap, deterministic, and always
 * available, unlike a live LLM call on every page view. Styled as plain
 * editorial context rather than an "AI insight" callout.
 */
export function AiSummary({ movie }: { movie: MovieProfile }) {
  const genrePhrase = movie.genreNames.slice(0, 2).join(" / ") || "genre-defying";
  const directorPhrase = movie.director ? ` directed by ${movie.director}` : "";
  const castPhrase = movie.castNames.length > 0 ? ` Starring ${movie.castNames.slice(0, 3).join(", ")}.` : "";
  const ratingPhrase =
    movie.voteAverage >= 7.5
      ? " Consistently highly rated by viewers."
      : movie.voteAverage >= 6
        ? " Solidly reviewed by viewers."
        : "";

  return (
    <p className="text-muted leading-relaxed max-w-3xl border-l-2 border-primary/40 pl-4">
      A {genrePhrase} film{directorPhrase}.{castPhrase}
      {ratingPhrase}
    </p>
  );
}
