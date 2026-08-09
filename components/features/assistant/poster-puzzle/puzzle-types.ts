import type { MovieProfile } from "@/types/movie";
import { INDUSTRIES } from "@/lib/industries";

export type PuzzleMovie = Pick<MovieProfile, "id" | "title" | "posterPath" | "voteAverage" | "releaseYear">;

/** Where the puzzle's movie pool comes from — general Trending, or one of
 *  the same industry/language categories used on /dashboard/categories.
 *  Reuses the existing by-industry API; no new backend involved. */
export type PuzzleSource = "trending" | (typeof INDUSTRIES)[number]["id"];

export const SOURCE_OPTIONS: { id: PuzzleSource; label: string }[] = [
  { id: "trending", label: "Trending" },
  ...INDUSTRIES.map((industry) => ({ id: industry.id, label: industry.label })),
];

export type Difficulty = "easy" | "medium" | "hard";

export type PuzzleStatus = "loading" | "intro" | "ready" | "playing" | "celebrating" | "solved" | "error";

interface DifficultyConfig {
  size: number;
  shuffle: number;
  label: string;
}

/** Grid size + shuffle-move count per difficulty. Shuffle count scales with
 *  grid size so harder puzzles start further from solved. */
export const DIFFICULTY_CONFIG: Record<Difficulty, DifficultyConfig> = {
  easy: { size: 3, shuffle: 20, label: "Easy" },
  medium: { size: 4, shuffle: 50, label: "Medium" },
  hard: { size: 5, shuffle: 100, label: "Hard" },
};

export const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

export const MAX_HINTS = 3;

/** Orthogonal neighbor positions of `pos` on a `size`×`size` grid. */
export function getNeighbors(pos: number, size: number): number[] {
  const row = Math.floor(pos / size);
  const col = pos % size;
  const neighbors: number[] = [];
  if (row > 0) neighbors.push(pos - size);
  if (row < size - 1) neighbors.push(pos + size);
  if (col > 0) neighbors.push(pos - 1);
  if (col < size - 1) neighbors.push(pos + 1);
  return neighbors;
}

/**
 * Builds a guaranteed-solvable puzzle by starting from the solved
 * arrangement and performing `shuffleCount` legal random moves — never a
 * raw random permutation, which can produce impossible 15-puzzle states.
 * Each tile in the returned array is the "home" index of the piece
 * currently sitting in that slot; the last index (`size*size - 1`) is the
 * blank.
 */
export function buildShuffledTiles(size: number, shuffleCount: number): number[] {
  const total = size * size;
  const tiles = Array.from({ length: total }, (_, i) => i);
  let blankPos = total - 1;
  let previousBlankPos = -1;

  for (let i = 0; i < shuffleCount; i++) {
    const candidates = getNeighbors(blankPos, size).filter((n) => n !== previousBlankPos);
    const next = candidates[Math.floor(Math.random() * candidates.length)];
    [tiles[blankPos], tiles[next]] = [tiles[next], tiles[blankPos]];
    previousBlankPos = blankPos;
    blankPos = next;
  }

  // Vanishingly rare, but if the shuffle happened to land back on solved
  // (e.g. shuffleCount is tiny), nudge it once more so there's always a puzzle to solve.
  if (tiles.every((v, i) => v === i)) {
    const candidates = getNeighbors(blankPos, size);
    const next = candidates[0];
    [tiles[blankPos], tiles[next]] = [tiles[next], tiles[blankPos]];
  }

  return tiles;
}

export function isSolved(tiles: number[]): boolean {
  return tiles.every((v, i) => v === i);
}

/** Stable day-of-year seed — used for "Today's Poster" so everyone gets the same pick on a given day, without any backend. */
export function dayOfYearSeed(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diffMs = now.getTime() - start.getTime();
  return Math.floor(diffMs / 86_400_000);
}

export function formatElapsed(ms: number): string {
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds - minutes * 60;
  return `${String(minutes).padStart(2, "0")}:${seconds.toFixed(2).padStart(5, "0")}`;
}
