"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Search } from "lucide-react";
import { useCommandPalette } from "@/components/providers/command-palette-provider";
import { greetingForHour, TIMEZONE_COOKIE } from "@/lib/time-of-day";

interface OverviewHeroProps {
  /** Signed-in user's first name, or null for guests. */
  firstName: string | null;
  /** Hour the server computed (from the viewer's saved time zone when known) — used for the first paint only. */
  serverHour: number;
}

function subscribeToClock(onChange: () => void) {
  const id = setInterval(onChange, 60_000);
  return () => clearInterval(id);
}

/**
 * Restrained hero for the Overview — a greeting, one line of framing copy,
 * and a search entry point. The search field opens the existing ⌘K
 * palette, so there's exactly one search experience in the app.
 *
 * The greeting follows the *viewer's* clock, not the server's: the server
 * renders with the viewer's saved time zone (cookie) when it has one, and
 * `useSyncExternalStore` switches to the browser's local hour right after
 * hydration without a hydration mismatch. The time zone is then saved so
 * the next server render is already correct.
 */
export function OverviewHero({ firstName, serverHour }: OverviewHeroProps) {
  const { open } = useCommandPalette();
  const hour = useSyncExternalStore(subscribeToClock, () => new Date().getHours(), () => serverHour);
  const greeting = `${greetingForHour(hour)}${firstName ? `, ${firstName}` : ""}.`;

  useEffect(() => {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!timeZone) return;
    const current = document.cookie.split("; ").find((entry) => entry.startsWith(`${TIMEZONE_COOKIE}=`));
    if (current !== `${TIMEZONE_COOKIE}=${encodeURIComponent(timeZone)}`) {
      document.cookie = `${TIMEZONE_COOKIE}=${encodeURIComponent(timeZone)}; path=/; max-age=31536000; samesite=lax`;
    }
  }, []);

  return (
    <div className="mb-10">
      <p className="text-muted mb-1">{greeting}</p>
      <h1 className="font-serif text-3xl sm:text-4xl mb-6 text-balance">What are you watching tonight?</h1>

      <button
        onClick={open}
        className="w-full max-w-xl flex items-center gap-3 rounded-lg bg-surface border border-white/10 px-4 py-3 text-left text-muted hover:border-white/20 hover:text-text transition-colors"
      >
        <Search className="size-4 shrink-0" />
        <span className="text-sm">Search movies, actors, genres…</span>
        <kbd className="ml-auto hidden sm:inline text-[11px] text-muted border border-white/10 rounded px-1.5 py-0.5">
          ⌘K
        </kbd>
      </button>
    </div>
  );
}
