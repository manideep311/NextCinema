"use client";

import { Lightbulb, RotateCcw, Shuffle } from "lucide-react";
import {
  DIFFICULTIES,
  DIFFICULTY_CONFIG,
  formatElapsed,
  type Difficulty,
} from "@/components/features/assistant/poster-puzzle/puzzle-types";

interface PuzzleControlsProps {
  difficulty: Difficulty;
  elapsedMs: number;
  moves: number;
  hintsRemaining: number;
  disabled: boolean;
  onChangeDifficulty: (d: Difficulty) => void;
  onHint: () => void;
  onRestart: () => void;
  onNewPoster: () => void;
}

export function PuzzleControls({
  difficulty,
  elapsedMs,
  moves,
  hintsRemaining,
  disabled,
  onChangeDifficulty,
  onHint,
  onRestart,
  onNewPoster,
}: PuzzleControlsProps) {
  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="tabular-nums text-text" aria-live="polite">
          {formatElapsed(elapsedMs)}
        </span>
        <span className="text-muted" aria-live="polite">
          {moves} {moves === 1 ? "move" : "moves"}
        </span>
      </div>

      <div className="flex items-center gap-1.5" role="tablist" aria-label="Difficulty">
        {DIFFICULTIES.map((d) => (
          <button
            key={d}
            role="tab"
            aria-selected={difficulty === d}
            onClick={() => onChangeDifficulty(d)}
            className={`flex-1 text-xs py-1.5 rounded-md border transition-colors ${
              difficulty === d
                ? "border-primary/50 bg-primary/15 text-primary"
                : "border-white/10 text-muted hover:text-text hover:border-white/20"
            }`}
          >
            {DIFFICULTY_CONFIG[d].label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onHint}
          disabled={hintsRemaining <= 0}
          aria-label={`Hint, ${hintsRemaining} remaining`}
          className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-muted hover:text-text hover:border-white/20 transition-colors disabled:opacity-40 disabled:pointer-events-none"
        >
          <Lightbulb className="size-3.5" strokeWidth={1.75} />
          Hint · {hintsRemaining}
        </button>
        <button
          onClick={onRestart}
          aria-label="Restart puzzle"
          className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-muted hover:text-text hover:border-white/20 transition-colors"
        >
          <RotateCcw className="size-3.5" strokeWidth={1.75} />
          Restart
        </button>
        <button
          onClick={onNewPoster}
          disabled={disabled}
          aria-label="Load a new poster"
          title="New Poster"
          className="inline-flex items-center justify-center px-2.5 py-2 rounded-lg bg-white/5 border border-white/10 text-muted hover:text-text hover:border-white/20 transition-colors disabled:opacity-40 disabled:pointer-events-none"
        >
          <Shuffle className="size-3.5" strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}
