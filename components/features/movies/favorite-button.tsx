"use client";

import { useRef, useState } from "react";
import { Heart } from "lucide-react";
import { motion, AnimatePresence, useAnimationControls, useReducedMotion } from "framer-motion";
import { useRouter, usePathname } from "next/navigation";
import { useFavorites } from "@/hooks/use-favorites";
import { useAuth } from "@/components/providers/auth-provider";
import type { StoredMovie } from "@/types/storage";

interface FavoriteButtonProps {
  movie: Omit<StoredMovie, "addedAt">;
  /** Stops the click from also triggering a parent Link navigation,
   *  since this button sits inside clickable MovieCard links. */
  className?: string;
  /** Renders a full labeled pill button ("Add to Favorites" / "Favorited")
   *  instead of the small icon-only control used on poster overlays —
   *  for prominent, unambiguous placements like the movie detail page. */
  showLabel?: boolean;
}

/** Favorites are account-only (same as watchlist) — signed-out visitors get sent to sign in instead of a Local Storage save nobody could ever see again. */
export function FavoriteButton({ movie, className = "", showLabel = false }: FavoriteButtonProps) {
  const { user } = useAuth();
  const { isFavorite, toggleFavorite, isFavoritePending } = useFavorites();
  const router = useRouter();
  const pathname = usePathname();
  const active = isFavorite(movie.id);
  const pending = isFavoritePending(movie.id);
  const reducedMotion = useReducedMotion();

  // Imperative controls, not a state-driven keyframe — that's what keeps
  // the pop tied to an actual click instead of replaying on every render
  // where `active` happens to be true (e.g. hydration, list re-renders).
  const iconControls = useAnimationControls();
  const rippleIdRef = useRef(0);
  const [rippleKey, setRippleKey] = useState<number | null>(null);

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    if (pending) return; // mutation already in flight for this movie

    const willBeActive = !active;
    toggleFavorite(movie);

    if (!reducedMotion) {
      iconControls.start({ scale: [1, 1.22, 1], transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] } });
      if (willBeActive) {
        rippleIdRef.current += 1;
        setRippleKey(rippleIdRef.current);
      }
    }
  }

  const icon = (
    <motion.span animate={iconControls} className="relative inline-flex">
      {!showLabel && !reducedMotion && (
        <AnimatePresence>
          {rippleKey !== null && (
            <motion.span
              key={rippleKey}
              aria-hidden="true"
              initial={{ scale: 0.3, opacity: 0.55 }}
              animate={{ scale: 1.8, opacity: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              onAnimationComplete={() => setRippleKey(null)}
              className="absolute inset-0 -m-1.5 rounded-full bg-primary/60"
            />
          )}
        </AnimatePresence>
      )}
      <Heart
        className={`relative size-4 transition-colors ${
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
        className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium border transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
          active
            ? "bg-primary/15 border-primary/50 text-primary"
            : "border-white/15 text-text hover:border-white/30 hover:bg-white/5"
        } ${className}`}
      >
        {icon}
        {active ? "Favorited" : "Add to Favorites"}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      aria-label={active ? "Remove from favorites" : "Add to favorites"}
      aria-pressed={active}
      aria-busy={pending}
      className={`relative rounded-full bg-black/45 hover:bg-black/65 p-1.5 transition-colors overflow-visible disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
    >
      {icon}
    </button>
  );
}
