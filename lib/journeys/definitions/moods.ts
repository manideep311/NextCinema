import { GENRE } from "@/lib/tmdb-genres";
import type { JourneyDefinition, JourneyRules, JourneySource } from "@/types/journey";

// MOOD journeys — deterministic metadata rules, no classifier or LLM.
// A mood is expressed as genre inclusions/exclusions (e.g. "Feel Good" =
// comedy/family/music, never horror/thriller/crime/war) plus rating and
// vote floors, or — where genres are too blunt — TMDB keyword tagging.
// The same rules are sent to TMDB and re-checked locally.

const DARK = [GENRE.horror, GENRE.thriller, GENRE.crime, GENRE.war];

interface MoodSpec {
  slug: string;
  name: string;
  description: string;
  aliases?: string[];
  source?: JourneySource;
  rules: JourneyRules;
}

const DISCOVER_BY_RATING: JourneySource = { kind: "discover", sortBy: "vote_average.desc", pages: 2 };

const SPECS: MoodSpec[] = [
  {
    slug: "feel-good",
    name: "Feel Good",
    description: "Warm, funny, uplifting — nothing dark, all heart.",
    aliases: ["feel-good", "uplifting", "happy", "cheer me up"],
    rules: { anyGenres: [GENRE.comedy, GENRE.family, GENRE.music], excludeGenres: DARK, minVotes: 1000, minRating: 7 },
  },
  {
    slug: "comfort-watch",
    name: "Comfort Watch",
    description: "Familiar, gentle animated and family favorites for a quiet night.",
    aliases: ["comfort", "cozy", "wholesome"],
    rules: { anyGenres: [GENRE.animation, GENRE.family], excludeGenres: [...DARK, GENRE.horror], minVotes: 1500, minRating: 7.2 },
  },
  {
    slug: "make-me-laugh",
    name: "Make Me Laugh",
    description: "Pure comedies — no heavy drama, just laughs.",
    aliases: ["funny", "laugh", "hilarious"],
    rules: { genres: [GENRE.comedy], excludeGenres: [GENRE.drama, ...DARK], minVotes: 1500, minRating: 6.8 },
  },
  {
    slug: "make-me-cry",
    name: "Make Me Cry",
    description: "Dramas TMDB tags as tearjerkers and stories of grief — bring tissues.",
    aliases: ["sad", "tearjerker", "cry", "emotional"],
    source: { kind: "keyword", keywords: ["tearjerker", "grief", "terminal illness"], sortBy: "vote_count.desc", pages: 2 },
    rules: { genres: [GENRE.drama], excludeGenres: [GENRE.comedy, GENRE.horror], minVotes: 500, minRating: 7 },
  },
  {
    slug: "dark-intense",
    name: "Dark & Intense",
    description: "Gripping crime and thrillers with real weight.",
    aliases: ["dark", "intense", "gritty"],
    rules: { anyGenres: [GENRE.thriller, GENRE.crime], excludeGenres: [GENRE.comedy, GENRE.family, GENRE.animation], minVotes: 2000, minRating: 7.5 },
  },
  {
    slug: "hopeful",
    name: "Hopeful",
    description: "Stories TMDB tags as inspirational — people rising above circumstance.",
    aliases: ["inspirational", "inspiring", "hope"],
    source: { kind: "keyword", keywords: ["inspirational", "hope", "based on true story"], sortBy: "vote_count.desc", pages: 2 },
    rules: { excludeGenres: [GENRE.horror, GENRE.documentary], minVotes: 800, minRating: 7.2 },
  },
  {
    slug: "romantic",
    name: "Romantic",
    description: "Love stories, well told — no scares, no body count.",
    aliases: ["romantic", "date night"],
    rules: { genres: [GENRE.romance], excludeGenres: [GENRE.horror, GENRE.thriller], minVotes: 1000, minRating: 7 },
  },
  {
    slug: "nostalgic",
    name: "Nostalgic",
    description: "Well-loved adventures, comedies, and family films from the '80s and '90s.",
    aliases: ["nostalgia", "80s", "90s", "retro"],
    rules: {
      anyGenres: [GENRE.adventure, GENRE.comedy, GENRE.family, GENRE.fantasy],
      excludeGenres: [GENRE.horror],
      releasedAfterYear: 1980,
      releasedBeforeYear: 1999,
      minVotes: 1000,
      minRating: 7,
    },
  },
  {
    slug: "thought-provoking",
    name: "Thought-Provoking",
    description: "Films tagged with big ideas — philosophy, identity, artificial minds, and dystopias.",
    aliases: ["philosophical", "mind-bending", "cerebral", "deep"],
    source: { kind: "keyword", keywords: ["philosophy", "existentialism", "artificial intelligence (a.i.)", "dystopia", "moral dilemma"], sortBy: "vote_count.desc", pages: 2 },
    rules: { excludeGenres: [GENRE.documentary], minVotes: 1000, minRating: 7.3 },
  },
  {
    slug: "adrenaline-rush",
    name: "Adrenaline Rush",
    description: "High-octane action that doesn't let up.",
    aliases: ["adrenaline", "high octane", "action-packed"],
    source: { kind: "discover", sortBy: "vote_count.desc", pages: 2 },
    rules: { genres: [GENRE.action], anyGenres: [GENRE.thriller, GENRE.adventure], minVotes: 3000, minRating: 6.8 },
  },
  {
    slug: "chilled-out",
    name: "Chilled Out",
    description: "Easy, light, and under two hours — low stakes, good company.",
    aliases: ["chill", "relaxing", "easy watch", "light"],
    rules: {
      anyGenres: [GENRE.comedy, GENRE.romance, GENRE.animation],
      excludeGenres: [GENRE.action, ...DARK, GENRE.horror],
      maxRuntime: 110,
      minVotes: 800,
      minRating: 6.8,
    },
  },
  {
    slug: "suspenseful",
    name: "Suspenseful",
    description: "Mysteries and thrillers built on tension, not gore.",
    aliases: ["suspense", "tense", "edge of my seat"],
    rules: { anyGenres: [GENRE.thriller, GENRE.mystery], excludeGenres: [GENRE.comedy, GENRE.horror, GENRE.animation], minVotes: 1500, minRating: 7.2 },
  },
];

export const MOOD_JOURNEYS: JourneyDefinition[] = SPECS.map((spec) => ({
  id: `mood-${spec.slug}`,
  type: "mood",
  name: spec.name,
  shortName: spec.name,
  description: spec.description,
  aliases: [spec.name.toLowerCase(), ...(spec.aliases ?? [])],
  source: spec.source ?? DISCOVER_BY_RATING,
  rules: { minRuntime: 60, ...spec.rules, excludeGenres: [GENRE.tvMovie, ...(spec.rules.excludeGenres ?? [])] },
  ranking: { quality: 0.55, consensus: 0.3, popularity: 0.15 },
  selection: { maxMovies: 15, perDecadeCap: 4 },
  minimumMovies: 8,
  freshness: "daily",
}));
