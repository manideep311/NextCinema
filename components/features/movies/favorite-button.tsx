"use client";

import { Heart } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useFavorites } from "@/hooks/use-favorites";
import { useAuth } from "@/components/providers/auth-provider";
import type { StoredMovie } from "@/types/storage";

interface FavoriteButtonProps {
  movie: Omit<StoredMovie, "addedAt">;
  /** Stops the click from also triggering a parent Link navigation,
   *  since this button sits inside clickable MovieCard links. */
  className?: string;
}

/** Favorites are account-only (same as watchlist) — signed-out visitors get sent to sign in instead of a Local Storage save nobody could ever see again. */
export function FavoriteButton({ movie, className = "" }: FavoriteButtonProps) {
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const router = useRouter();
  const pathname = usePathname();
  const active = isFavorite(movie.id);

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!user) {
          router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
          return;
        }

        toggleFavorite(movie);
      }}
      aria-label={active ? "Remove from favorites" : "Add to favorites"}
      aria-pressed={active}
      className={`glass rounded-full p-1.5 transition-colors ${className}`}
    >
      <Heart
        className={`size-4 transition-colors ${
          active ? "fill-current text-primary" : "text-white"
        }`}
      />
    </button>
  );
}
