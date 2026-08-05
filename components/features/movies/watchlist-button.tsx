"use client";

import { Bookmark } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useWatchlist } from "@/hooks/use-watchlist";
import { useAuth } from "@/components/providers/auth-provider";
import type { StoredMovie } from "@/types/storage";

interface WatchlistButtonProps {
  movie: Omit<StoredMovie, "addedAt">;
  className?: string;
}

/** Watchlist is account-only — signed-out visitors get sent to sign in
 *  (with a redirect back to whatever they were looking at) instead of a
 *  silent Local Storage fallback like favorites gets. */
export function WatchlistButton({ movie, className = "" }: WatchlistButtonProps) {
  const { user } = useAuth();
  const { isInWatchlist, toggleWatchlist } = useWatchlist();
  const router = useRouter();
  const pathname = usePathname();
  const active = isInWatchlist(movie.id);

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!user) {
          router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
          return;
        }

        toggleWatchlist(movie);
      }}
      aria-label={active ? "Remove from watchlist" : "Add to watchlist"}
      aria-pressed={active}
      className={`glass rounded-full p-1.5 transition-colors ${className}`}
    >
      <Bookmark
        className={`size-4 transition-colors ${active ? "fill-current text-accent" : "text-white"}`}
      />
    </button>
  );
}
