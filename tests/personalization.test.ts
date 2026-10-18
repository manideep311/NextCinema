import { test } from "node:test";
import assert from "node:assert/strict";
import { blendSeedRecommendations, MAX_SEEDS, SEED_WEIGHTS } from "@/lib/personalization";

const seed = (id: number) => ({ id, title: `Favourite ${id}` });
const rec = (id: number, matchScore: number) => ({ id, matchScore });

test("seed weights favour recent favourites and cover at most five seeds", () => {
  assert.equal(MAX_SEEDS, 5);
  assert.deepEqual([...SEED_WEIGHTS], [1, 0.8, 0.6, 0.4, 0.2]);
});

test("a fit with the newest favourite outranks the same fit with an older one", () => {
  const picks = blendSeedRecommendations(
    [
      { seed: seed(1), recommendations: [rec(10, 80)] },
      { seed: seed(2), recommendations: [rec(20, 80)] },
    ],
    new Set(),
    10
  );
  assert.deepEqual(picks.map((p) => p.movie.id), [10, 20]);
  assert.ok(Math.abs(picks[0].blendedScore - 0.8) < 1e-12);
  assert.ok(Math.abs(picks[1].blendedScore - 0.64) < 1e-12);
});

test("a movie that fits several favourites rises, and is explained by its strongest seed", () => {
  const picks = blendSeedRecommendations(
    [
      { seed: seed(1), recommendations: [rec(10, 90), rec(30, 50)] },
      { seed: seed(2), recommendations: [rec(30, 70)] },
      { seed: seed(3), recommendations: [rec(30, 60)] },
    ],
    new Set(),
    10
  );
  // 30: 0.5 + 0.56 + 0.36 = 1.42  >  10: 0.9
  assert.deepEqual(picks.map((p) => p.movie.id), [30, 10]);
  // Strongest single contribution for 30 is seed 2 (0.8 × 70 = 56) over seed 1 (1 × 50).
  assert.equal(picks[0].seed.id, 2);
  assert.equal(picks[0].movie.matchScore, 70);
});

test("excluded movies are skipped, seeds beyond five are ignored, and the limit applies", () => {
  const lists = Array.from({ length: 7 }, (_, i) => ({ seed: seed(i + 1), recommendations: [rec(100 + i, 50), rec(1, 99)] }));
  const picks = blendSeedRecommendations(lists, new Set([1]), 10);
  assert.deepEqual(picks.map((p) => p.movie.id).sort(), [100, 101, 102, 103, 104]);
  assert.equal(blendSeedRecommendations(lists, new Set([1]), 2).length, 2);
});

test("blending is deterministic regardless of tie order", () => {
  const lists = [{ seed: seed(1), recommendations: [rec(5, 60), rec(3, 60), rec(4, 60)] }];
  assert.deepEqual(blendSeedRecommendations(lists, new Set(), 10).map((p) => p.movie.id), [3, 4, 5]);
});
