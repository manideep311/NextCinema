import type { MovieProfile } from "@/types/movie";

/**
 * A one-paragraph summary filled in from a template using the movie's own
 * profile data (genres, director, top cast, rating) — cheap, deterministic,
 * and always available. No language model is involved, and the label says
 * so plainly.
 */
export function QuickSummary({ movie }: { movie: MovieProfile }) {
  const genrePhrase = movie.genreNames.slice(0, 2).join(" / ") || "genre-defying";
  const directorNames = movie.directors.map((person) => person.name);
  const directorPhrase = directorNames.length > 0 ? ` directed by ${directorNames.join(" & ")}` : "";
  const castNames = movie.cast.slice(0, 3).map((person) => person.name);
  const castPhrase = castNames.length > 0 ? ` Starring ${castNames.join(", ")}.` : "";
  const ratingPhrase =
    movie.voteAverage >= 7.5
      ? " Consistently highly rated by viewers."
      : movie.voteAverage >= 6
        ? " Solidly reviewed by viewers."
        : "";

  return (
    <div className="max-w-3xl border-l-2 border-primary/40 pl-4">
      <p className="text-xs uppercase tracking-wide text-muted mb-1">Quick summary</p>
      <p className="text-muted leading-relaxed">
        A {genrePhrase} film{directorPhrase}.{castPhrase}
        {ratingPhrase}
      </p>
    </div>
  );
}
