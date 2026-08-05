import { Sparkles } from "lucide-react";
import type { MovieProfile } from "@/types/movie";

/**
 * A short synthesized "AI note" built from the movie's own profile data
 * (genres, director, top cast) — cheap, deterministic, and always
 * available, unlike a live LLM call on every page view.
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
    <div className="glass rounded-xl p-5 flex gap-3">
      <div className="size-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
        <Sparkles className="size-4 text-accent" />
      </div>
      <p className="text-sm text-muted leading-relaxed">
        A {genrePhrase} film{directorPhrase}.{castPhrase}
        {ratingPhrase}
      </p>
    </div>
  );
}
