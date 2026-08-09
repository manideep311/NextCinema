"use client";

import { Clapperboard } from "lucide-react";
import { SOURCE_OPTIONS, type PuzzleSource } from "@/components/features/assistant/poster-puzzle/puzzle-types";

interface PuzzleSourceSelectProps {
  source: PuzzleSource;
  disabled: boolean;
  onChange: (source: PuzzleSource) => void;
}

/**
 * Lets the player pick which movie pool the puzzle draws from — Trending,
 * or one of the same industry/language categories used on
 * /dashboard/categories (reuses that exact API). Kept visible independent
 * of the board/loading state so switching categories never feels like the
 * controls vanished.
 */
export function PuzzleSourceSelect({ source, disabled, onChange }: PuzzleSourceSelectProps) {
  return (
    <label className="flex items-center gap-2 text-xs text-muted mb-3">
      <Clapperboard className="size-3.5 shrink-0" strokeWidth={1.75} />
      <span className="sr-only">Poster category</span>
      <select
        value={source}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as PuzzleSource)}
        aria-label="Poster category"
        className="flex-1 bg-surface border border-white/10 rounded-md px-2 py-1.5 text-xs text-text outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
      >
        {SOURCE_OPTIONS.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
