"use client";

import { useRef, useState, useEffect } from "react";
import { Bookmark } from "lucide-react";
import { motion, AnimatePresence, useAnimationControls, useReducedMotion } from "framer-motion";
import { useRouter, usePathname } from "next/navigation";
import { useWatchlist } from "@/hooks/use-watchlist";
import { useAuth } from "@/components/providers/auth-provider";
import type { StoredMovie } from "@/types/storage";

interface WatchlistButtonProps {
  movie: Omit<StoredMovie, "addedAt">;
  className?: string;
  /** Renders a full labeled pill button ("Add to Watchlist" / "In Watchlist")
   *  instead of the small icon-only control used on poster overlays —
   *  for prominent, unambiguous placements like the movie detail page. */
  showLabel?: boolean;
}

const CONFIRMATION_MS = 1800;

/** Watchlist is account-only — signed-out visitors get sent to sign in
 *  (with a redirect back to whatever they were looking at) instead of a
 *  silent Local Storage fallback like favorites gets. */
export function WatchlistButton({ movie, className = "", showLabel = false }: WatchlistButtonProps) {
  const { user } = useAuth();
  const { isInWatchlist, toggleWatchlist, isWatchlistPending } = useWatchlist();
  const router = useRouter();
  const pathname = usePathname();
  const active = isInWatchlist(movie.id);
  const pending = isWatchlistPending(movie.id);
  const reducedMotion = useReducedMotion();

  const iconControls = useAnimationControls();
  const [justAdded, setJustAdded] = useState(false);
  const dismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (dismissRef.current) clearTimeout(dismissRef.current);
  }, []);

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    if (pending) return; // mutation already in flight for this movie

    const willBeActive = !active;
    toggleWatchlist(movie);

    if (!reducedMotion) {
      iconControls.start({ scale: [1, 1.22, 1], transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] } });
    }

    // Small, local, understated — not a global toast system. Only shown on
    // the labeled variant (movie detail page); the compact card icon has
    // no room for it and doesn't need one.
    if (showLabel && willBeActive) {
      setJustAdded(true);
      if (dismissRef.current) clearTimeout(dismissRef.current);
      dismissRef.current = setTimeout(() => setJustAdded(false), CONFIRMATION_MS);
    }
  }

  const icon = (
    <motion.span animate={iconControls} className="inline-flex">
      <Bookmark
        className={`size-4 transition-colors ${
          active ? "fill-current text-primary" : showLabel ? "text-current" : "text-white"
        }`}
      />
    </motion.span>
  );

  if (showLabel) {
    return (
      <button
        onClick={handleClick}
        disabled={pending}
        aria-pressed={active}
        aria-busy={pending}
        className={`relative inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium border transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
          active
            ? "bg-primary/15 border-primary/50 text-primary"
            : "border-white/15 text-text hover:border-white/30 hover:bg-white/5"
        } ${className}`}
      >
        {icon}
        {active ? "In Watchlist" : "Add to Watchlist"}

        <AnimatePresence>
          {justAdded && (
            <motion.span
              role="status"
              aria-live="polite"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="absolute -bottom-6 left-0 text-xs text-primary whitespace-nowrap"
            >
              Added to watchlist
            </motion.span>
          )}
        </AnimatePresence>
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      aria-label={active ? "Remove from watchlist" : "Add to watchlist"}
      aria-pressed={active}
      aria-busy={pending}
      className={`rounded-full bg-black/45 hover:bg-black/65 p-1.5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
    >
      {icon}
    </button>
  );
}
