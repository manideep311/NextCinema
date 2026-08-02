import Image from "next/image";
import { Star, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { MovieProfile } from "@/types/movie";

interface MovieHeroProps {
  movie: MovieProfile;
  backdropPath: string | null;
  tagline: string | null;
  runtime: number | null;
}

const IMAGE_BASE_URL = process.env.NEXT_PUBLIC_TMDB_IMAGE_BASE_URL;

function formatRuntime(minutes: number | null): string | null {
  if (!minutes) return null;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

export function MovieHero({ movie, backdropPath, tagline, runtime }: MovieHeroProps) {
  return (
    <div className="relative -mx-4 md:-mx-8 -mt-4 md:-mt-8 mb-8">
      <div className="relative h-64 md:h-96 w-full">
        {backdropPath && (
          <Image
            src={`${IMAGE_BASE_URL}/w1280${backdropPath}`}
            alt=""
            fill
            className="object-cover"
            priority
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/20" />
      </div>

      <div className="relative -mt-24 md:-mt-32 px-4 md:px-8 flex flex-col md:flex-row gap-6">
        <div className="w-32 md:w-48 shrink-0 rounded-xl overflow-hidden glass shadow-2xl">
          {movie.posterPath ? (
            <Image
              src={`${IMAGE_BASE_URL}/w342${movie.posterPath}`}
              alt={movie.title}
              width={342}
              height={513}
              className="w-full h-auto"
            />
          ) : (
            <div className="aspect-[2/3] flex items-center justify-center text-muted text-xs">
              No poster
            </div>
          )}
        </div>

        <div className="flex-1 pt-2 md:pt-16">
          <h1 className="font-heading text-2xl md:text-4xl font-bold mb-1">{movie.title}</h1>
          {tagline && <p className="text-muted italic mb-3">{tagline}</p>}

          <div className="flex flex-wrap items-center gap-4 mb-4 text-sm text-muted">
            <span className="flex items-center gap-1">
              <Star className="size-4 fill-current text-yellow-500" />
              {movie.voteAverage.toFixed(1)}
            </span>
            {movie.releaseYear && <span>{movie.releaseYear}</span>}
            {runtime && (
              <span className="flex items-center gap-1">
                <Clock className="size-4" />
                {formatRuntime(runtime)}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {movie.genreNames.map((genre) => (
              <Badge key={genre} variant="secondary" className="glass border-white/10">
                {genre}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
