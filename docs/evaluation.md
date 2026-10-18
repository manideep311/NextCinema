# Offline evaluation

How well does the recommendation engine rank candidates, compared with two
simple baselines? This page describes the method and records the latest
numbers. Everything here is produced by one command:

```bash
npm run eval
```

The script is [`scripts/evaluate-recommendations.ts`](../scripts/evaluate-recommendations.ts);
the scoring logic it relies on lives in [`lib/evaluation.ts`](../lib/evaluation.ts)
and is unit-tested in [`tests/evaluation.test.ts`](../tests/evaluation.test.ts).
The script rewrites the **Results** section below on every run.

## Method

**Seeds.** The 50 most-voted movies on TMDB that have at least one genre
(`/discover/movie?sort_by=vote_count.desc`, pages 1–3, on the run date). The
exact list used is in the per-seed table under Results.

**Ground truth.** For each seed, TMDB's own `/movie/{id}/recommendations`
(page 1), filtered with the same eligibility rules as candidates (released
by the run date, not adult, has a poster, not the seed). This is a *weak*
ground truth: it is TMDB's recommender, not people's judgements.

**Candidate pool.** Built exactly as in production
([`lib/candidate-pool.ts`](../lib/candidate-pool.ts)) — TMDB `/similar`
pages 1–2 plus the most-voted `/discover` results in the seed's first two
genres, interleaved, de-duplicated, capped at 40 — **except that the
`/recommendations` source is left out.** Then it is restricted to
candidates whose details, credits and keywords were fetched successfully.

**Avoiding leakage.** Production also pulls candidates from
`/recommendations`. Because that list *is* the ground truth here, keeping it
would put the answers straight into the pool, so the evaluation removes that
source entirely. Ground-truth movies can still be in the pool, but only
when `/similar` or `/discover` returned them on their own. No feature is
derived from the ground-truth list: each candidate is described only by its
own TMDB genres, keywords, cast, directors, rating and popularity.

**Methods.** All three re-rank the *same* pool, so they differ only in
ordering:

| Method | Ranking |
|---|---|
| TMDB /similar order | The order TMDB's `/similar` returned (page 1 then 2); pool members it didn't return go last |
| Genre-only Jaccard | Jaccard overlap of genre ids with the seed; ties by Bayesian-adjusted rating, then id |
| NextCinema engine | `recommendMovies` from [`lib/recommendation-engine.ts`](../lib/recommendation-engine.ts) |

**Metrics.** Mean over seeds with a non-empty ground truth:

- **precision@10** — share of the top 10 that is in the ground truth.
- **nDCG@10** — binary relevance, DCG = Σ relᵢ / log₂(i + 1), divided by
  the DCG of a perfect top 10 (min(10, |ground truth|) hits first).

The output also reports how many ground-truth movies were in the pool at
all, which caps what *any* re-ranking can reach.

## Results

<!-- eval-results:start -->
Run on **2026-10-18** with `npm run eval` — 50 seeds with a non-empty ground truth (of 50 evaluated).

| Method | precision@10 | nDCG@10 |
|---|---|---|
| TMDB /similar order | 0.010 | 0.017 |
| Genre-only Jaccard | 0.274 | 0.288 |
| NextCinema engine | 0.318 | 0.368 |

Pools averaged 40.0 candidates; ground truth averaged 20.0 movies, of which 3.7 were in the pool (0.3 of them returned by /similar; the rest only by /discover). That caps precision@10 for *any* re-ranking of these pools at **0.374**.

<details><summary>Per-seed results (precision@10)</summary>

| Seed | TMDB id | Pool | Ground truth | In pool | TMDB /similar order | Genre-only Jaccard | NextCinema engine |
|---|---|---|---|---|---|---|---|
| Interstellar | 157336 | 40 | 20 | 1 | 0.000 | 0.100 | 0.100 |
| Inception | 27205 | 40 | 20 | 1 | 0.100 | 0.100 | 0.100 |
| The Avengers | 24428 | 40 | 20 | 9 | 0.000 | 0.500 | 0.700 |
| The Dark Knight | 155 | 40 | 20 | 1 | 0.000 | 0.100 | 0.100 |
| Avatar | 19995 | 40 | 20 | 1 | 0.000 | 0.100 | 0.100 |
| Deadpool | 293660 | 40 | 20 | 0 | 0.000 | 0.000 | 0.000 |
| Avengers: Infinity War | 299536 | 40 | 20 | 8 | 0.000 | 0.600 | 0.800 |
| Fight Club | 550 | 40 | 20 | 0 | 0.000 | 0.000 | 0.000 |
| The Shawshank Redemption | 278 | 40 | 20 | 2 | 0.000 | 0.200 | 0.200 |
| Pulp Fiction | 680 | 40 | 20 | 0 | 0.000 | 0.000 | 0.000 |
| Forrest Gump | 13 | 40 | 20 | 0 | 0.000 | 0.000 | 0.000 |
| Guardians of the Galaxy | 118340 | 40 | 20 | 5 | 0.000 | 0.300 | 0.500 |
| Harry Potter and the Philosopher's Stone | 671 | 40 | 20 | 7 | 0.000 | 0.700 | 0.700 |
| Avengers: Endgame | 299534 | 40 | 20 | 6 | 0.000 | 0.400 | 0.600 |
| Iron Man | 1726 | 40 | 20 | 9 | 0.000 | 0.500 | 0.800 |
| The Matrix | 603 | 40 | 20 | 1 | 0.000 | 0.000 | 0.100 |
| Django Unchained | 68718 | 40 | 20 | 3 | 0.100 | 0.100 | 0.100 |
| The Lord of the Rings: The Fellowship of the Ring | 120 | 40 | 20 | 3 | 0.000 | 0.300 | 0.300 |
| Joker | 475557 | 40 | 20 | 1 | 0.000 | 0.100 | 0.100 |
| Titanic | 597 | 40 | 20 | 4 | 0.000 | 0.200 | 0.200 |
| The Lord of the Rings: The Return of the King | 122 | 40 | 20 | 4 | 0.000 | 0.200 | 0.200 |
| The Wolf of Wall Street | 106646 | 40 | 20 | 1 | 0.000 | 0.000 | 0.000 |
| Shutter Island | 11324 | 40 | 20 | 1 | 0.000 | 0.100 | 0.000 |
| Avengers: Age of Ultron | 99861 | 40 | 20 | 6 | 0.000 | 0.600 | 0.600 |
| The Dark Knight Rises | 49026 | 40 | 20 | 2 | 0.000 | 0.100 | 0.200 |
| Inglourious Basterds | 16869 | 40 | 20 | 0 | 0.000 | 0.000 | 0.000 |
| Mad Max: Fury Road | 76341 | 40 | 20 | 0 | 0.000 | 0.000 | 0.000 |
| The Lord of the Rings: The Two Towers | 121 | 40 | 20 | 4 | 0.000 | 0.200 | 0.200 |
| Captain America: Civil War | 271110 | 40 | 20 | 7 | 0.000 | 0.400 | 0.700 |
| Harry Potter and the Chamber of Secrets | 672 | 40 | 20 | 10 | 0.000 | 0.900 | 0.800 |
| Black Panther | 284054 | 40 | 20 | 8 | 0.000 | 0.600 | 0.800 |
| Spider-Man: Homecoming | 315635 | 40 | 20 | 6 | 0.100 | 0.400 | 0.600 |
| Doctor Strange | 284052 | 40 | 20 | 2 | 0.100 | 0.100 | 0.100 |
| Inside Out | 150540 | 40 | 20 | 3 | 0.000 | 0.100 | 0.200 |
| Iron Man 3 | 68721 | 40 | 20 | 8 | 0.000 | 0.700 | 0.700 |
| Se7en | 807 | 40 | 20 | 0 | 0.000 | 0.000 | 0.000 |
| The Hunger Games | 70160 | 40 | 20 | 0 | 0.000 | 0.000 | 0.000 |
| Harry Potter and the Prisoner of Azkaban | 673 | 40 | 20 | 9 | 0.000 | 0.800 | 0.900 |
| The Godfather | 238 | 40 | 20 | 3 | 0.000 | 0.300 | 0.300 |
| Guardians of the Galaxy Vol. 2 | 283995 | 40 | 20 | 9 | 0.000 | 0.500 | 0.600 |
| Captain America: The First Avenger | 1771 | 40 | 20 | 8 | 0.000 | 0.700 | 0.800 |
| Batman Begins | 272 | 40 | 20 | 0 | 0.000 | 0.000 | 0.000 |
| Spider-Man: No Way Home | 634649 | 40 | 20 | 7 | 0.000 | 0.500 | 0.600 |
| Iron Man 2 | 10138 | 40 | 20 | 9 | 0.000 | 0.700 | 0.700 |
| Star Wars | 11 | 40 | 20 | 2 | 0.000 | 0.100 | 0.100 |
| Thor | 10195 | 40 | 20 | 1 | 0.000 | 0.100 | 0.100 |
| Pirates of the Caribbean: The Curse of the Black Pearl | 22 | 40 | 20 | 1 | 0.100 | 0.100 | 0.000 |
| Harry Potter and the Goblet of Fire | 674 | 40 | 20 | 7 | 0.000 | 0.700 | 0.700 |
| Thor: Ragnarok | 284053 | 40 | 20 | 6 | 0.000 | 0.400 | 0.400 |
| Back to the Future | 105 | 40 | 20 | 1 | 0.000 | 0.100 | 0.100 |

</details>
<!-- eval-results:end -->

### Reading the 2026-10-18 run

- On these seeds the engine ranks ahead of both baselines on both metrics
  (precision@10 0.318 vs 0.274 for genre-only Jaccard; nDCG@10 0.368 vs
  0.288). The gap to the genre-only baseline is modest, and 50 seeds with
  no significance test can't show it is robust.
- The ceiling matters more than the gap: only 3.7 of the ~20 ground-truth
  movies per seed were in the pool at all, capping precision@10 at 0.374
  for any re-ranking. The engine reaches 0.318 of that 0.374.
- TMDB's `/similar` and `/recommendations` barely overlap: just 0.3 of
  those 3.7 reachable movies per seed came from `/similar`, and the rest
  came only from the most-voted `/discover` titles in the seed's genres.
  That is why the `/similar`-order baseline scores near zero. It also means
  this benchmark rewards putting popular same-genre films first, which
  the engine's popularity-closeness signal does for popular seeds like
  these. Don't read this as the engine being better than TMDB's
  `/similar` in general.

## Limitations

- **The ground truth is another recommender.** Agreeing with TMDB's
  `/recommendations` is not the same as being useful to people. TMDB doesn't
  document how that list is built (it is believed to lean on co-engagement
  as well as metadata), so a content-based engine is not expected to match
  it closely. The numbers compare methods with each other; they are not an
  absolute quality score.
- **Popular seeds only.** The 50 most-voted films are where TMDB's lists are
  densest. Results for niche or regional films may differ.
- **The pool caps every method.** Methods only re-rank the candidates that
  `/similar` and `/discover` returned; if the ground truth isn't in the pool,
  no ranking can find it. The reported ceiling makes this explicit.
- **Ground truth mostly enters through `/discover`.** See the run notes
  above: most reachable ground-truth movies are popular same-genre titles
  from `/discover`, so the benchmark favours methods that rank popular,
  same-genre films first.
- **The baseline shares inputs.** The `/similar` baseline is TMDB's own
  ordering of part of the same pool, so it has an advantage the other two
  don't (it chose those candidates).
- **Live data.** TMDB lists, votes and popularity change daily, so runs on
  different dates aren't strictly comparable. The script caches responses
  under `node_modules/.cache/nextcinema-eval`, so re-runs on the same cache
  are reproducible; `npm run eval -- --fresh` refetches.
- **One snapshot, no significance testing.** With 50 seeds, small
  differences between methods may be noise.
