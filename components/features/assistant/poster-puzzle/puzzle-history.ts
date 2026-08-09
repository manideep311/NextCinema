import { readFromStorage, writeToStorage } from "@/lib/local-storage";
import type { Difficulty } from "@/components/features/assistant/poster-puzzle/puzzle-types";

const KEY = "cinematch:poster-puzzle-history";
const MAX_ENTRIES = 20;

export interface PuzzleCompletion {
  movieId: number;
  title: string;
  difficulty: Difficulty;
  timeMs: number;
  moves: number;
  completedAt: number;
}

/**
 * Self-contained taste signal — completions are kept in Local Storage only.
 * Deliberately NOT wired into the account-side favorites/watchlist/history
 * services or the recommendation engine: this is flavor data for a possible
 * future personalization feature, not a reason to touch either right now.
 * Works for guests and signed-in users alike since nothing here is account-scoped.
 */
export function recordPuzzleCompletion(entry: PuzzleCompletion): void {
  const current = readFromStorage<PuzzleCompletion[]>(KEY) ?? [];
  const next = [entry, ...current].slice(0, MAX_ENTRIES);
  writeToStorage(KEY, next);
}

export function getPuzzleHistory(): PuzzleCompletion[] {
  return readFromStorage<PuzzleCompletion[]>(KEY) ?? [];
}
