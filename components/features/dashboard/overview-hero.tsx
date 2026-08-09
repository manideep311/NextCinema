"use client";

import { Search } from "lucide-react";
import { useCommandPalette } from "@/components/providers/command-palette-provider";

interface OverviewHeroProps {
  greeting: string;
}

/**
 * Restrained hero for the Overview — a greeting, one line of framing copy,
 * and a search entry point. The search field itself opens the existing
 * ⌘K command palette rather than reimplementing search inline, so there's
 * exactly one search experience in the app, not two.
 */
export function OverviewHero({ greeting }: OverviewHeroProps) {
  const { open } = useCommandPalette();

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
