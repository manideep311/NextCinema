// Deterministic mood/genre keyword matching — no LLM. Every phrase here
// maps to one or more TMDB genre IDs; a query is scanned for substring
// matches (longest/most specific phrases first) and the matched genre
// IDs feed straight into TMDB's /discover/movie with_genres filter.
// Deliberately simple: this understands "sad romantic drama", not
// "something like Interstellar" — free-form recall needs an LLM, which
// this app doesn't use anywhere.

const GENRE = {
  action: 28,
  adventure: 12,
  animation: 16,
  comedy: 35,
  crime: 80,
  documentary: 99,
  drama: 18,
  family: 10751,
  fantasy: 14,
  history: 36,
  horror: 27,
  music: 10402,
  mystery: 9648,
  romance: 10749,
  sciFi: 878,
  thriller: 53,
  war: 10752,
  western: 37,
} as const;

interface MoodEntry {
  phrases: string[];
  genres: number[];
}

const MOOD_LEXICON: MoodEntry[] = [
  { phrases: ["mind-blowing", "mind blowing", "plot twist", "mind bending", "mind-bending"], genres: [GENRE.thriller, GENRE.mystery] },
  { phrases: ["tearjerker", "heartbreaking", "cry", "crying", "sad"], genres: [GENRE.drama] },
  { phrases: ["feel-good", "feel good", "uplifting", "wholesome", "cheer me up"], genres: [GENRE.comedy, GENRE.family] },
  { phrases: ["hilarious", "funny", "laugh out loud", "laugh", "comedy"], genres: [GENRE.comedy] },
  { phrases: ["scary", "horror", "spooky", "creepy", "terrifying"], genres: [GENRE.horror] },
  { phrases: ["romantic", "romance", "love story"], genres: [GENRE.romance] },
  { phrases: ["action-packed", "action packed", "action"], genres: [GENRE.action] },
  { phrases: ["epic journey", "adventure"], genres: [GENRE.adventure] },
  { phrases: ["sci-fi", "science fiction", "space", "futuristic", "dystopian"], genres: [GENRE.sciFi] },
  { phrases: ["fantasy", "magical", "magic"], genres: [GENRE.fantasy] },
  { phrases: ["true story", "based on a true story", "historical", "history"], genres: [GENRE.history] },
  { phrases: ["war movie", "war"], genres: [GENRE.war] },
  { phrases: ["musical", "music"], genres: [GENRE.music] },
  { phrases: ["documentary", "true crime"], genres: [GENRE.documentary, GENRE.crime] },
  { phrases: ["heist", "detective", "crime"], genres: [GENRE.crime, GENRE.mystery] },
  { phrases: ["kids movie", "family friendly", "family"], genres: [GENRE.family] },
  { phrases: ["animated", "animation", "cartoon"], genres: [GENRE.animation] },
  { phrases: ["cozy", "relaxing", "chill", "easy watch"], genres: [GENRE.comedy, GENRE.family] },
  { phrases: ["tense", "suspenseful", "suspense", "edge of my seat"], genres: [GENRE.thriller] },
  { phrases: ["western", "cowboy"], genres: [GENRE.western] },
  { phrases: ["whodunit", "mystery"], genres: [GENRE.mystery] },
  { phrases: ["underrated", "hidden gem", "slow burn"], genres: [GENRE.drama] },
];

/** Scans free text for mood/genre phrases and returns the matched, deduped TMDB genre IDs (empty array if nothing recognized). */
export function detectGenresFromQuery(query: string): number[] {
  const lower = query.toLowerCase();
  const matched = new Set<number>();

  for (const entry of MOOD_LEXICON) {
    if (entry.phrases.some((phrase) => lower.includes(phrase))) {
      entry.genres.forEach((id) => matched.add(id));
    }
  }

  return [...matched];
}
