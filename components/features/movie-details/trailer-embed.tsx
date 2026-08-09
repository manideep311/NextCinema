"use client";

import { useState } from "react";
import Image from "next/image";
import { Play } from "lucide-react";
import type { TmdbVideo } from "@/types/tmdb";
import { pickBestTrailer } from "@/lib/movie-details/trailer";

interface TrailerEmbedProps {
  videos: TmdbVideo[];
}

export function TrailerEmbed({ videos }: TrailerEmbedProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const trailer = pickBestTrailer(videos);

  if (!trailer) return null;

  if (isPlaying) {
    return (
      <div className="aspect-video rounded-lg overflow-hidden">
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
      className="relative aspect-video rounded-lg overflow-hidden glass w-full group"
    >
      <Image
        src={`https://img.youtube.com/vi/${trailer.key}/hqdefault.jpg`}
        alt={trailer.name}
        fill
        sizes="(min-width: 1024px) 768px, 100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-black/50 flex items-center justify-center group-hover:bg-black/60 transition-colors">
        <div className="size-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center transition-transform group-hover:scale-105">
          <Play className="size-5 fill-current ml-0.5" />
        </div>
      </div>
    </button>
  );
}
