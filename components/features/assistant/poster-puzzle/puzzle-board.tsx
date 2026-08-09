"use client";

import { useCallback, useEffect, useRef } from "react";
import { PuzzleTile } from "@/components/features/assistant/poster-puzzle/puzzle-tile";

interface PuzzleBoardProps {
  tiles: number[];
  size: number;
  posterUrl: string;
  disabled: boolean;
  reducedMotion: boolean;
  hint: { from: number; to: number } | null;
  onMove: (position: number) => void;
}

/**
 * The NxN grid itself. Sizing/layout only — all game rules live in
 * use-poster-puzzle.ts. Also owns a light keyboard layer: with the board
 * focused, arrow keys slide whichever tile is adjacent to the blank in
 * that direction, as a faster alternative to tabbing to individual tiles.
 */
export function PuzzleBoard({ tiles, size, posterUrl, disabled, reducedMotion, hint, onMove }: PuzzleBoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const blankHome = size * size - 1;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;
      const blankPos = tiles.indexOf(blankHome);
      const row = Math.floor(blankPos / size);
      const col = blankPos % size;

      // Arrow keys move the tile *into* the blank from that direction —
      // e.g. ArrowDown slides the tile above the blank downward.
      let targetPos: number | null = null;
      if (e.key === "ArrowUp" && row < size - 1) targetPos = blankPos + size;
      else if (e.key === "ArrowDown" && row > 0) targetPos = blankPos - size;
      else if (e.key === "ArrowLeft" && col < size - 1) targetPos = blankPos + 1;
      else if (e.key === "ArrowRight" && col > 0) targetPos = blankPos - 1;

      if (targetPos !== null) {
        e.preventDefault();
        onMove(targetPos);
      }
    },
    [disabled, tiles, blankHome, size, onMove]
  );

  useEffect(() => {
    if (disabled) return;
    const el = boardRef.current;
    el?.addEventListener("touchmove", preventScrollIfPlaying, { passive: false });
    return () => el?.removeEventListener("touchmove", preventScrollIfPlaying);
  }, [disabled]);

  return (
    <div
      ref={boardRef}
      role="group"
      aria-label={`Poster puzzle, ${size} by ${size}. Use arrow keys or tap a tile to move it.`}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="grid gap-[3px] bg-black/40 p-[3px] rounded-lg aspect-[2/3] w-full max-w-[240px] mx-auto shadow-lg ring-1 ring-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary select-none touch-manipulation"
      style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
    >
      {tiles.map((home, position) => (
        <PuzzleTile
          key={home}
          home={home}
          row={Math.floor(home / size)}
          col={home % size}
          size={size}
          posterUrl={posterUrl}
          isBlank={home === blankHome}
          isHintFrom={hint?.from === position}
          isHintTo={hint?.to === position}
          disabled={disabled}
          reducedMotion={reducedMotion}
          onClick={() => onMove(position)}
        />
      ))}
    </div>
  );
}

// Puzzle is tap/click-driven, not drag-driven — this just stops a stray
// touchmove on the board from also scrolling the companion panel behind it.
function preventScrollIfPlaying(e: TouchEvent) {
  e.preventDefault();
}
