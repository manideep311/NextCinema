/** Global mean rating used as the Bayesian prior (a typical TMDB vote average). */
export const PRIOR_MEAN_RATING = 6.5;

/**
 * Rating pulled toward the global mean in proportion to how few votes back
 * it: (v·R + C·m) / (v + C), with R the vote average, v the vote count, m
 * PRIOR_MEAN_RATING and C `priorVotes`. A 9.0 from five votes lands near
 * 6.5; a 9.0 from 20,000 votes stays near 9.0.
 */
export function bayesianRating(voteAverage: number, voteCount: number, priorVotes: number): number {
  return (voteCount / (voteCount + priorVotes)) * voteAverage + (priorVotes / (voteCount + priorVotes)) * PRIOR_MEAN_RATING;
}
