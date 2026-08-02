"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import type { TmdbVideo } from "@/types/tmdb";

interface TrailerEmbedProps {
  videos: TmdbVideo[];
}

function pickBestTrailer(videos: TmdbVideo[]): TmdbVideo | null {
  const youtubeTrailers = videos.filter((v) => v.site === "YouTube" && v.type === "Trailer");
  return youtubeTrailers.find((v) => v.official) ?? youtubeTrailers[0] ?? null;
}

export function TrailerEmbed({ videos }: TrailerEmbedProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const trailer = pickBestTrailer(videos);

  if (!trailer) return null;

  if (isPlaying) {
    return (
      <div className="aspect-video rounded-xl overflow-hidden">
        <iframe
          src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1`}
          title={trailer.name}
          allow="accelerate; autoplay; encrypted-media"
          allowFullScreen
          className="w-full h-full"
        />
      </div>
    );
  }

  return (
    <button
      onClick={() => setIsPlaying(true)}
      className="relative aspect-video rounded-xl overflow-hidden glass w-full group"
    >
      <img
        src={`https://img.youtube.com/vi/${trailer.key}/hqdefault.jpg`}
        alt={trailer.name}
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/50 transition-colors">
        <div className="size-16 rounded-full bg-primary flex items-center justify-center">
          <Play className="size-6 fill-current ml-1" />
        </div>
      </div>
    </button>
  );
}
