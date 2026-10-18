import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { WhyThis } from "@/components/features/movies/why-this";
import { explainScore } from "@/lib/recommendation-engine";
import type { MovieProfile } from "@/types/movie";

function profile(overrides: Partial<MovieProfile> & { id: number }): MovieProfile {
  return {
    title: `Movie ${overrides.id}`,
    posterPath: null,
    releaseYear: "2014",
    genreIds: [],
    genreNames: [],
    keywords: [],
    cast: [],
    directors: [],
    popularity: 10,
    voteAverage: 7,
    voteCount: 1000,
    ...overrides,
  };
}

test('"Why this?" shows every signal with its similarity and weight, and marks missing data', () => {
  const seed = profile({ id: 1, title: "Interstellar", genreIds: [878, 18], keywords: ["space"], cast: [{ id: 1, name: "A" }], directors: [{ id: 2, name: "B" }] });
  const pick = profile({ id: 2, genreIds: [878], directors: [{ id: 2, name: "B" }] });
  const breakdown = explainScore(seed, pick);
  const score = Math.round(breakdown.normalized * 100);

  const html = renderToStaticMarkup(<WhyThis explanation={{ comparedWith: "Interstellar", signals: breakdown.explanation }} score={score} />);

  assert.match(html, /Why this\?/);
  assert.match(html, /Compared with <span[^>]*>Interstellar<\/span>/);
  for (const label of ["Genres", "Keywords", "Top-billed cast", "Director", "Rating (closeness)", "Popularity (closeness)"]) {
    assert.ok(html.includes(label), label);
  }
  assert.match(html, /50% · weight 35%/); // genre Jaccard {878,18} vs {878}
  assert.match(html, /100% · weight 10%/); // same director
  assert.equal((html.match(/no data/g) ?? []).length, 2); // the pick has no keywords or cast
  assert.ok(html.includes(`${score}% match`));
});
