import { GENRE } from "@/lib/tmdb-genres";

// Deterministic mood/genre phrase matching — no LLM. Each entry maps
// phrases to TMDB genre ids. Matching is whole-word ("war" doesn't fire
// inside "star wars"), longest phrase first, and each matched span is
// consumed so a shorter phrase can't re-match inside it ("i'm sad" is
// read as a request to be cheered up, not as "sad").
//
// Each matched entry becomes one genre *group*: genres within a group are
// alternatives (OR), separate groups must all hold (AND) — so "sad romantic
// drama" means drama AND romance, while "feel-good" means comedy OR family.
// `all: true` entries contribute one group per genre ("rom-com" = romance
// AND comedy).

interface MoodEntry {
  phrases: string[];
  genres: number[];
  all?: boolean;
  /** Genres that contradict the mood ("cheer me up" never means a crime thriller). */
  exclude?: number[];
}

const DARK_GENRES = [GENRE.horror, GENRE.thriller, GENRE.crime, GENRE.war];

const MOOD_LEXICON: MoodEntry[] = [
  { phrases: ["mind-blowing", "mind blowing", "plot twist", "plot twists", "mind bending", "mind-bending", "twisty"], genres: [GENRE.thriller, GENRE.mystery] },
  // Asking to be cheered up: the "sad" here describes the viewer, not the movie.
  { phrases: ["cheer me up", "i'm sad", "im sad", "i am sad", "feeling sad", "feeling down", "feeling low", "make me happy"], genres: [GENRE.comedy, GENRE.family], exclude: DARK_GENRES },
  { phrases: ["tearjerker", "tearjerkers", "heartbreaking", "cry", "crying", "sad", "emotional", "drama", "dramas", "family drama", "slow burn"], genres: [GENRE.drama] },
  { phrases: ["feel-good", "feel good", "uplifting", "wholesome"], genres: [GENRE.comedy, GENRE.family], exclude: DARK_GENRES },
  { phrases: ["rom com", "rom-com", "romcom", "rom coms", "rom-coms", "romantic comedy", "romantic comedies"], genres: [GENRE.romance, GENRE.comedy], all: true },
  { phrases: ["hilarious", "funny", "laugh out loud", "laugh", "comedy", "comedies"], genres: [GENRE.comedy] },
  { phrases: ["scary", "horror", "spooky", "creepy", "terrifying"], genres: [GENRE.horror] },
  { phrases: ["romantic", "romance", "love story", "love stories"], genres: [GENRE.romance] },
  { phrases: ["action-packed", "action packed", "action"], genres: [GENRE.action] },
  { phrases: ["epic journey", "adventure", "adventures"], genres: [GENRE.adventure] },
  { phrases: ["sci-fi", "sci fi", "scifi", "science fiction", "space", "futuristic", "dystopian"], genres: [GENRE.sciFi] },
  { phrases: ["fantasy", "magical", "magic"], genres: [GENRE.fantasy] },
  { phrases: ["true story", "based on a true story", "historical", "history"], genres: [GENRE.history] },
  { phrases: ["war movie", "war movies", "war"], genres: [GENRE.war] },
  { phrases: ["musical", "musicals", "music"], genres: [GENRE.music] },
  { phrases: ["documentary", "documentaries", "true crime"], genres: [GENRE.documentary, GENRE.crime] },
  { phrases: ["heist", "heists", "detective", "crime"], genres: [GENRE.crime, GENRE.mystery] },
  { phrases: ["kids movie", "kids movies", "family friendly", "family"], genres: [GENRE.family] },
  { phrases: ["animated", "animation", "cartoon", "cartoons"], genres: [GENRE.animation] },
  { phrases: ["cozy", "relaxing", "chill", "easy watch"], genres: [GENRE.comedy, GENRE.family], exclude: DARK_GENRES },
  { phrases: ["thriller", "thrillers", "tense", "suspenseful", "suspense", "edge of my seat"], genres: [GENRE.thriller] },
  { phrases: ["dark and intense", "dark", "intense", "gritty", "disturbing", "bleak"], genres: [GENRE.thriller, GENRE.crime, GENRE.drama], exclude: [GENRE.comedy, GENRE.family, GENRE.animation] },
  { phrases: ["western", "westerns", "cowboy"], genres: [GENRE.western] },
  { phrases: ["whodunit", "mystery", "mysteries"], genres: [GENRE.mystery] },
];

/** Every phrase with its entry, longest first — longer, more specific phrases win. */
const PHRASES = MOOD_LEXICON.flatMap((entry) => entry.phrases.map((phrase) => ({ phrase, entry }))).sort(
  (a, b) => b.phrase.length - a.phrase.length
);

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const PHRASE_PATTERNS = PHRASES.map(({ phrase, entry }) => ({
  entry,
  pattern: new RegExp(`(^|[^a-z0-9'])${escapeRegExp(phrase)}(?=$|[^a-z0-9])`, "i"),
}));

export interface MoodMatch {
  /** Genre groups: OR within a group, AND across groups. */
  groups: number[][];
  /** Genres excluded by the matched moods. */
  exclude: number[];
  /** The input with every matched phrase removed. */
  remaining: string;
}

/** Scans lower-cased text for mood/genre phrases (whole words, longest first, consuming matches). */
export function matchMoodPhrases(text: string): MoodMatch {
  let remaining = ` ${text.toLowerCase()} `;
  // Entry → position of its first match, so groups come out in query order.
  const firstMatch = new Map<MoodEntry, number>();

  for (const { entry, pattern } of PHRASE_PATTERNS) {
    let match = pattern.exec(remaining);
    while (match) {
      const start = match.index + match[1].length;
      const end = match.index + match[0].length;
      firstMatch.set(entry, Math.min(firstMatch.get(entry) ?? Infinity, start));
      // Blank the span with same-length padding so later positions stay comparable.
      remaining = `${remaining.slice(0, start)}${" ".repeat(end - start)}${remaining.slice(end)}`;
      match = pattern.exec(remaining);
    }
  }

  const matchedEntries = [...firstMatch.entries()].sort((a, b) => a[1] - b[1]).map(([entry]) => entry);
  const groups: number[][] = [];
  const seen = new Set<string>();
  for (const entry of matchedEntries) {
    const entryGroups = entry.all ? entry.genres.map((genre) => [genre]) : [entry.genres];
    for (const group of entryGroups) {
      const key = [...group].sort((a, b) => a - b).join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      groups.push(group);
    }
  }

  const exclude = [...new Set(matchedEntries.flatMap((entry) => entry.exclude ?? []))].filter(
    (genre) => !groups.some((group) => group.includes(genre))
  );
  return { groups, exclude, remaining: remaining.replace(/\s+/g, " ").trim() };
}
