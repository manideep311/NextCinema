import { test } from "node:test";
import assert from "node:assert/strict";
import { bayesianRating, PRIOR_MEAN_RATING } from "@/lib/rating";

test("bayesianRating shrinks thinly-voted ratings toward the prior and leaves well-voted ones alone", () => {
  assert.equal(bayesianRating(9, 0, 100), PRIOR_MEAN_RATING);
  assert.ok(Math.abs(bayesianRating(9, 5, 100) - (5 * 9 + 100 * 6.5) / 105) < 1e-12);
  assert.ok(Math.abs(bayesianRating(9, 20_000, 100) - 9) < 0.02);
  assert.ok(bayesianRating(9, 50, 100) < bayesianRating(8.5, 5_000, 100));
});
