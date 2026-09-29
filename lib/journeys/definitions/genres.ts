import { GENRE } from "@/lib/tmdb-genres";
import type { JourneyDefinition } from "@/types/journey";

// GENRE journeys — not a genre filter (that's the Categories page, sorted
// by popularity). Each one is a *path through the genre's history*: the
// best-regarded films by Bayesian rating and vote consensus, capped per
// decade so the path spans eras, then walked in release order.

interface GenreJourneySpec {
  slug: string;
  name: string;
  genre: number;
  description: string;
  aliases?: string[];
  /** Vote floor — lower for genres TMDB users rate less often. */
  minVotes?: number;
  /** Genres that would make a result read as "unrelated" for this path. */
  excludeGenres?: number[];
  minRuntime?: number;
}

const SPECS: GenreJourneySpec[] = [
  { slug: "action", name: "Action", genre: GENRE.action, description: "The action films that set the standard, decade by decade.", aliases: ["action movies", "fight", "stunts"] },
  { slug: "adventure", name: "Adventure", genre: GENRE.adventure, description: "Epic quests and grand expeditions, from the classics to today.", aliases: ["adventure movies", "quest"] },
  { slug: "animation", name: "Animation", genre: GENRE.animation, description: "Landmark animated films across studios, styles, and eras.", aliases: ["animated", "cartoon", "anime", "pixar", "ghibli"] },
  { slug: "comedy", name: "Comedy", genre: GENRE.comedy, description: "The comedies audiences still quote — a laugh-out-loud path through the decades.", aliases: ["funny", "comedies"] },
  { slug: "crime", name: "Crime", genre: GENRE.crime, description: "Gangsters, cops, and con artists — the defining crime films.", aliases: ["gangster", "mafia", "mob"] },
  { slug: "documentary", name: "Documentary", genre: GENRE.documentary, description: "Acclaimed documentaries worth your time.", aliases: ["docs", "documentaries"], minVotes: 250, minRuntime: 40 },
  { slug: "drama", name: "Drama", genre: GENRE.drama, description: "Essential dramas, from mid-century classics to modern masterpieces.", aliases: ["dramas"] },
  { slug: "family", name: "Family", genre: GENRE.family, description: "Films the whole family can share, across generations.", aliases: ["kids", "family friendly"], excludeGenres: [GENRE.horror] },
  { slug: "fantasy", name: "Fantasy", genre: GENRE.fantasy, description: "Magic, myth, and other worlds — the fantasy canon.", aliases: ["magic", "fantasy movies"] },
  { slug: "history", name: "History", genre: GENRE.history, description: "History on screen — the most acclaimed historical films.", aliases: ["historical", "period"], minVotes: 800 },
  { slug: "horror", name: "Horror", genre: GENRE.horror, description: "The horror films that defined each era of fear.", aliases: ["scary", "horror movies"] },
  { slug: "music", name: "Music", genre: GENRE.music, description: "Musicals, biopics, and films where music is the story.", aliases: ["musical", "musicals"], minVotes: 500 },
  { slug: "mystery", name: "Mystery", genre: GENRE.mystery, description: "Whodunits and puzzles worth solving, decade by decade.", aliases: ["whodunit", "mysteries"] },
  { slug: "romance", name: "Romance", genre: GENRE.romance, description: "The great love stories of cinema, in release order.", aliases: ["romantic", "love"] },
  { slug: "science-fiction", name: "Science Fiction", genre: GENRE.sciFi, description: "Landmarks of science fiction, from early visions to modern epics.", aliases: ["sci-fi", "scifi", "space"] },
  { slug: "thriller", name: "Thriller", genre: GENRE.thriller, description: "Edge-of-your-seat thrillers that raised the bar.", aliases: ["thrillers", "suspense"] },
  { slug: "war", name: "War", genre: GENRE.war, description: "War on film — the most acclaimed accounts of conflict.", aliases: ["war movies", "military"], minVotes: 800 },
  { slug: "western", name: "Western", genre: GENRE.western, description: "Frontier stories, from the classic era to revisionist westerns.", aliases: ["westerns", "cowboy"], minVotes: 400 },
];

export const GENRE_JOURNEYS: JourneyDefinition[] = SPECS.map((spec) => ({
  id: `genre-${spec.slug}`,
  type: "genre",
  name: spec.name,
  shortName: spec.name,
  description: spec.description,
  aliases: [spec.name.toLowerCase(), ...(spec.aliases ?? [])],
  source: { kind: "discover", sortBy: "vote_average.desc", pages: 2 },
  rules: {
    genres: [spec.genre],
    excludeGenres: [GENRE.tvMovie, ...(spec.excludeGenres ?? [])],
    minVotes: spec.minVotes ?? 1500,
    minRating: 7,
    minRuntime: spec.minRuntime ?? 60,
  },
  ranking: { quality: 0.6, consensus: 0.4 },
  selection: { maxMovies: 15, perDecadeCap: 3 },
  minimumMovies: 8,
  freshness: "daily",
}));
