import { MAX_TMDB_PAGE } from "@/lib/validation";

/**
 * The "Other" industry reads two TMDB /movie/popular pages per app page
 * (TMDB can't filter "language NOT IN (...)", so it over-fetches and
 * filters locally). TMDB rejects pages above MAX_TMDB_PAGE, so app pages
 * whose first TMDB page would be out of range return null — the caller
 * answers with an empty, final page instead of a failed TMDB request.
 */
export function otherIndustryTmdbPages(page: number): [number, number] | null {
  const first = page * 2 - 1;
  if (first > MAX_TMDB_PAGE) return null;
  return [first, Math.min(page * 2, MAX_TMDB_PAGE)];
}
