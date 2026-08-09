// Movie Journeys — app-level types.
//
// A journey never stores full movie records. Each entry is just enough to
// (a) identify the real movie via the existing TMDB integration, and (b)
// place it in whichever watch orders the franchise actually supports. The
// hydrated/resolved shape (with poster, runtime, etc.) is built at request
// time in services/journeys.ts — see that file for why.

export type JourneyOrderType = "release" | "chronological" | "essential";

export interface JourneyMovieDef {
  /** Official theatrical title — must match TMDB's own `title` field so it
   *  can be resolved via search and matched against movie detail pages
   *  without storing a TMDB id we can't verify from static data. */
  title: string;
  /** Verified theatrical release year — used both to disambiguate search
   *  results (remakes, re-releases) and to render immediately if a title
   *  hasn't resolved yet. */
  releaseYear: string;
  /** 1-based position in original theatrical release order. */
  releaseOrder: number;
  /** 1-based position in in-universe story order — omitted when the
   *  journey has no order distinct from release order. */
  chronologicalOrder?: number;
  /** Part of the trimmed "main story only" path — omitted entirely for
   *  journeys with no meaningful optional/side entries. */
  isEssential?: boolean;
}

export interface JourneyDef {
  id: string;
  name: string;
  /** Short label for tight spaces (nav, cards). */
  shortName: string;
  description: string;
  /** Extra search terms beyond the name/movie titles themselves. */
  aliases: string[];
  /** Which order types this journey actually supports — drives whether
   *  the order selector shows up at all, and with how many options. */
  availableOrders: JourneyOrderType[];
  movies: JourneyMovieDef[];
}

export type JourneyMovieState = "watched" | "next" | "upcoming";

/** A journey movie once resolved against the live TMDB catalog. `id` is
 *  null when resolution failed (e.g. TMDB search turned up nothing) —
 *  callers should render a graceful "poster unavailable" placeholder
 *  rather than dropping the entry, so the timeline's ordering stays intact. */
export interface ResolvedJourneyMovie extends JourneyMovieDef {
  id: number | null;
  posterPath: string | null;
  voteAverage: number | null;
  runtime: number | null;
  /** Real TMDB tagline/overview, when resolution succeeded — used for the
   *  journey hero's short blurb. Never invented; both fall back to null
   *  when TMDB has nothing (hero hides the line rather than making text up). */
  tagline: string | null;
  overview: string | null;
  state: JourneyMovieState;
}

export interface JourneyProgress {
  watchedCount: number;
  totalCount: number;
  /** Next unwatched movie in release order — the default "what's next"
   *  used by the dashboard and movie-detail integrations. Null once every
   *  movie in the journey has been watched. */
  nextMovie: ResolvedJourneyMovie | null;
}

export interface ResolvedJourney extends Omit<JourneyDef, "movies"> {
  movies: ResolvedJourneyMovie[];
  progress: JourneyProgress;
}
