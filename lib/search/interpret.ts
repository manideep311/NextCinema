import { matchMoodPhrases } from "@/lib/mood-lexicon";
import { GENRE, GENRE_NAMES } from "@/lib/tmdb-genres";

// Deterministic search-query interpretation — no LLM. Turns a free-text
// query into structured intents the search service can execute against
// TMDB. Anything it can't interpret reliably is left alone, and the
// service falls back to plain title search.
//
// Detectors run in a fixed order, each consuming the words it recognized,
// so later detectors never re-read them:
//   similarity ("movies like X") → person ("starring X", "directed by X")
//   → years/decades → quality ("underrated", "acclaimed")
//   → language/industry → mood/genre lexicon.

export type SearchQuality = "hidden-gem" | "acclaimed";

export interface YearRange {
  from?: number;
  to?: number;
  label: string;
  /** A bare year like "2019" — only applied when other intents exist, since "1917" or "2012" are also titles. */
  weak?: boolean;
}

export interface LanguageIntent {
  code?: string;
  originCountry?: string;
  label: string;
  /** Extra genre group implied by the word (e.g. "anime" = Japanese + animation). */
  genres?: number[];
}

export interface SearchIntent {
  raw: string;
  genreGroups: number[][];
  /** Genres the matched moods rule out (e.g. crime/thriller for "cheer me up"). */
  excludeGenres: number[];
  yearRange: YearRange | null;
  language: LanguageIntent | null;
  quality: SearchQuality | null;
  similarTo: string | null;
  person: { name: string; role: "cast" | "director" } | null;
  /** The whole query might be a person's name ("tom hanks") — verified against TMDB by the service. */
  personCandidate: string | null;
}

const LANGUAGE_WORDS: Record<string, LanguageIntent> = {
  hindi: { code: "hi", originCountry: "IN", label: "Hindi" },
  bollywood: { code: "hi", originCountry: "IN", label: "Hindi" },
  telugu: { code: "te", originCountry: "IN", label: "Telugu" },
  tollywood: { code: "te", originCountry: "IN", label: "Telugu" },
  tamil: { code: "ta", originCountry: "IN", label: "Tamil" },
  kollywood: { code: "ta", originCountry: "IN", label: "Tamil" },
  malayalam: { code: "ml", originCountry: "IN", label: "Malayalam" },
  mollywood: { code: "ml", originCountry: "IN", label: "Malayalam" },
  kannada: { code: "kn", originCountry: "IN", label: "Kannada" },
  sandalwood: { code: "kn", originCountry: "IN", label: "Kannada" },
  bengali: { code: "bn", label: "Bengali" },
  bangla: { code: "bn", label: "Bengali" },
  marathi: { code: "mr", label: "Marathi" },
  punjabi: { code: "pa", label: "Punjabi" },
  gujarati: { code: "gu", label: "Gujarati" },
  assamese: { code: "as", label: "Assamese" },
  odia: { code: "or", label: "Odia" },
  oriya: { code: "or", label: "Odia" },
  urdu: { code: "ur", label: "Urdu" },
  indian: { originCountry: "IN", label: "Indian" },
  korean: { code: "ko", label: "Korean" },
  japanese: { code: "ja", label: "Japanese" },
  anime: { code: "ja", label: "Anime", genres: [GENRE.animation] },
  chinese: { code: "zh", label: "Chinese" },
  mandarin: { code: "zh", label: "Mandarin" },
  cantonese: { code: "cn", label: "Cantonese" },
  french: { code: "fr", label: "French" },
  spanish: { code: "es", label: "Spanish" },
  italian: { code: "it", label: "Italian" },
  german: { code: "de", label: "German" },
  turkish: { code: "tr", label: "Turkish" },
  persian: { code: "fa", label: "Persian" },
  iranian: { code: "fa", label: "Persian" },
  thai: { code: "th", label: "Thai" },
  russian: { code: "ru", label: "Russian" },
  portuguese: { code: "pt", label: "Portuguese" },
  brazilian: { code: "pt", label: "Portuguese" },
  swedish: { code: "sv", label: "Swedish" },
  danish: { code: "da", label: "Danish" },
  english: { code: "en", label: "English" },
  hollywood: { code: "en", label: "English" },
};

/** Number of distinct film languages search understands — surfaced on the landing page. */
export const SUPPORTED_SEARCH_LANGUAGES = new Set(
  Object.values(LANGUAGE_WORDS).flatMap((intent) => (intent.code ? [intent.code] : []))
).size;

const QUALITY_PHRASES: { phrase: RegExp; quality: SearchQuality }[] = [
  { phrase: /\b(?:underrated|hidden gems?|lesser[- ]known|overlooked|under the radar)\b/, quality: "hidden-gem" },
  { phrase: /\b(?:critically acclaimed|acclaimed|top[- ]rated|highest[- ]rated|best|greatest|masterpieces?|must[- ](?:watch|see))\b/, quality: "acclaimed" },
];

const DECADE_WORDS: Record<string, number> = {
  fifties: 1950,
  sixties: 1960,
  seventies: 1970,
  eighties: 1980,
  nineties: 1990,
  noughties: 2000,
};

const FILLER = new Set([
  "movie", "movies", "film", "films", "flick", "flicks", "a", "an", "the", "some", "something", "anything", "with", "and",
  "of", "in", "for", "from", "me", "i", "to", "want", "watch", "show", "give", "find", "that", "is", "are", "good", "great",
  "really", "very", "please", "any",
]);

function consume(text: string, pattern: RegExp): { text: string; match: RegExpExecArray | null } {
  const match = pattern.exec(text);
  if (!match) return { text, match: null };
  return { text: `${text.slice(0, match.index)} ${text.slice(match.index + match[0].length)}`, match };
}

function decadeRange(start: number): YearRange {
  return { from: start, to: start + 9, label: `${start}s` };
}

function detectYears(input: string, nowYear: number): { text: string; range: YearRange | null } {
  let text = input;
  let step = consume(text, /\bbetween\s+(19\d{2}|20\d{2})\s+and\s+(19\d{2}|20\d{2})\b/);
  if (step.match) {
    const [a, b] = [Number(step.match[1]), Number(step.match[2])].sort((x, y) => x - y);
    return { text: step.text, range: { from: a, to: b, label: `${a}–${b}` } };
  }
  step = consume(text, /\b(?:before|pre)\s+(19\d{2}|20\d{2})\b/);
  if (step.match) return { text: step.text, range: { to: Number(step.match[1]) - 1, label: `Before ${step.match[1]}` } };
  step = consume(text, /\b(?:after|since|post)\s+(19\d{2}|20\d{2})\b/);
  if (step.match) return { text: step.text, range: { from: Number(step.match[1]), label: `Since ${step.match[1]}` } };
  step = consume(text, /\b(?:the\s+)?(19[1-9]0|20[0-3]0)'?s\b/);
  if (step.match) return { text: step.text, range: decadeRange(Number(step.match[1])) };
  step = consume(text, /(?:^|\s)(?:the\s+)?'?([0-9]0)'?s\b/);
  if (step.match) {
    const decade = Number(step.match[1]);
    // "90s" → 1990s; "00s"/"10s"/"20s" → 2000s/2010s/2020s.
    return { text: step.text, range: decadeRange(decade <= 20 ? 2000 + decade : 1900 + decade) };
  }
  for (const [word, start] of Object.entries(DECADE_WORDS)) {
    step = consume(text, new RegExp(`\\b${word}\\b`));
    if (step.match) return { text: step.text, range: decadeRange(start) };
  }
  step = consume(text, /\b(?:recent|new|latest|newest)\b/);
  if (step.match) return { text: step.text, range: { from: nowYear - 2, label: "Recent" } };
  step = consume(text, /\b(?:classic|classics|old|oldies|vintage)\b/);
  if (step.match) return { text: step.text, range: { to: 1979, label: "Classics" } };
  step = consume(text, /\b(?:from|in|of)\s+(19\d{2}|20\d{2})\b/);
  if (step.match) {
    const year = Number(step.match[1]);
    return { text: step.text, range: { from: year, to: year, label: String(year) } };
  }
  step = consume(text, /\b(19[2-9]\d|20[0-3]\d)\b/);
  if (step.match) {
    const year = Number(step.match[1]);
    return { text: step.text, range: { from: year, to: year, label: String(year), weak: true } };
  }
  text = input;
  return { text, range: null };
}

const SIMILAR_PATTERN = /^(?:(?:movies?|films?|something|anything|more|stuff)\s+)?(?:like|similar to)\s+(.{2,})$/i;
const CAST_PATTERN = /^(?:(?:movies?|films?)\s+)?(?:starring|featuring|with actor|with actress)\s+(.{3,})$/i;
const CAST_WITH_PATTERN = /^(?:movies?|films?)\s+with\s+(.{3,})$/i;
const DIRECTOR_PATTERN = /^(?:(?:movies?|films?)\s+)?(?:directed by|by director|from director)\s+(.{3,})$/i;
const DIRECTOR_BY_PATTERN = /^(?:movies?|films?)\s+by\s+(.{3,})$/i;
const POSSESSIVE_FILMS_PATTERN = /^([a-z .'-]{3,40}?)(?:'s)?\s+(?:movies|films|filmography)$/i;

function cleanName(value: string): string {
  return value.replace(/[?!.,]+$/, "").replace(/\s+/g, " ").trim();
}

/** True when a phrase is made of words other detectors own (so it isn't a person's name). */
function looksDescriptive(value: string): boolean {
  const lower = value.toLowerCase();
  if (matchMoodPhrases(lower).groups.length > 0) return true;
  if (lower.split(/\s+/).some((word) => word in LANGUAGE_WORDS)) return true;
  if (QUALITY_PHRASES.some(({ phrase }) => phrase.test(lower))) return true;
  return detectYears(lower, 2000).range !== null;
}

export function interpretQuery(query: string, nowYear: number = new Date().getFullYear()): SearchIntent {
  const raw = query.trim().replace(/\s+/g, " ");
  const intent: SearchIntent = {
    raw,
    genreGroups: [],
    excludeGenres: [],
    yearRange: null,
    language: null,
    quality: null,
    similarTo: null,
    person: null,
    personCandidate: null,
  };

  const similar = SIMILAR_PATTERN.exec(raw);
  if (similar) {
    intent.similarTo = cleanName(similar[1]);
    return intent;
  }

  const director = DIRECTOR_PATTERN.exec(raw) ?? DIRECTOR_BY_PATTERN.exec(raw);
  if (director && !looksDescriptive(director[1])) {
    intent.person = { name: cleanName(director[1]), role: "director" };
    return intent;
  }
  const cast = CAST_PATTERN.exec(raw) ?? CAST_WITH_PATTERN.exec(raw);
  if (cast && !looksDescriptive(cast[1])) {
    intent.person = { name: cleanName(cast[1]), role: "cast" };
    return intent;
  }
  const possessive = POSSESSIVE_FILMS_PATTERN.exec(raw);
  if (possessive && !looksDescriptive(possessive[1])) {
    intent.personCandidate = cleanName(possessive[1]);
    return intent;
  }

  let text = ` ${raw.toLowerCase()} `;

  const years = detectYears(text, nowYear);
  text = years.text;
  intent.yearRange = years.range;

  for (const { phrase, quality } of QUALITY_PHRASES) {
    const step = consume(text, phrase);
    if (step.match) {
      intent.quality = quality;
      text = step.text;
      break;
    }
  }

  for (const [word, language] of Object.entries(LANGUAGE_WORDS)) {
    const step = consume(text, new RegExp(`\\b${word}\\b`));
    if (step.match) {
      intent.language = language;
      text = step.text;
      break;
    }
  }

  const moods = matchMoodPhrases(text);
  intent.genreGroups = [...moods.groups];
  intent.excludeGenres = moods.exclude;
  if (intent.language?.genres) intent.genreGroups.push(intent.language.genres);

  const hasStrongIntent =
    intent.genreGroups.length > 0 || intent.language !== null || intent.quality !== null ||
    (intent.yearRange !== null && !intent.yearRange.weak);

  if (!hasStrongIntent) {
    intent.yearRange = null;
    // 2–4 plain words and nothing else recognized: possibly a person's name.
    const words = raw.split(" ");
    if (words.length >= 2 && words.length <= 4 && /^[a-zA-ZÀ-ɏ .'-]+$/.test(raw) && !words.every((word) => FILLER.has(word.toLowerCase()))) {
      intent.personCandidate = raw;
    }
  }
  return intent;
}

export function hasDiscoverIntent(intent: SearchIntent): boolean {
  return (
    intent.genreGroups.length > 0 || intent.language !== null || intent.quality !== null ||
    (intent.yearRange !== null && !intent.yearRange.weak)
  );
}

/** Human-readable summary of what the query was interpreted as, e.g. "Sci-Fi · 1990s · Hidden gems". */
export function describeIntent(intent: SearchIntent): string {
  const parts: string[] = [];
  const genreLabel = intent.genreGroups
    .map((group) => group.map((genre) => GENRE_NAMES[genre] ?? "").filter(Boolean).join(" / "))
    .filter(Boolean)
    .join(" + ");
  if (genreLabel) parts.push(genreLabel);
  if (intent.language) parts.push(intent.language.label);
  if (intent.yearRange) parts.push(intent.yearRange.label);
  if (intent.quality === "hidden-gem") parts.push("Hidden gems");
  if (intent.quality === "acclaimed") parts.push("Critically acclaimed");
  return parts.join(" · ");
}
