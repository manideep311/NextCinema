"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Check } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";

interface WatchedButtonProps {
  movieId: number;
  journeyId: string;
  isWatched: boolean;
}

/**
 * Explicit "I watched this" toggle — the only thing that advances journey
 * progress (opening a movie page no longer does). Styled with exactly the
 * classes of the labeled WatchlistButton it sits next to, so it reads as
 * part of the existing popup rather than a new element. After saving it
 * refreshes the server-rendered journey (hero, Before → Now → Next, track).
 */
export function WatchedButton({ movieId, journeyId, isWatched }: WatchedButtonProps) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [optimistic, setOptimistic] = useState<boolean | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, startRefresh] = useTransition();
  const active = optimistic ?? isWatched;
  const pending = isSaving || isRefreshing;

  async function handleClick() {
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    if (pending) return;

    const next = !active;
    setOptimistic(next);
    setIsSaving(true);
    try {
      const res = await fetch("/api/journeys/watched", {
        method: next ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next ? { movieId, journeyId } : { movieId }),
      });
      if (!res.ok) throw new Error(`Request failed with ${res.status}`);
      startRefresh(() => router.refresh());
    } catch {
      setOptimistic(null);
    } finally {
      setIsSaving(false);
    }
  }

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
      }`}
    >
      <Check className="size-4" />
      {active ? "Watched" : "Mark as Watched"}
    </button>
  );
}
