import { GENRE } from "@/lib/tmdb-genres";
import type { JourneyDefinition } from "@/types/journey";

// THEME journeys — membership comes from TMDB's own keyword tagging.
// Each theme lists one or more candidate keyword names; they're resolved
// to TMDB keyword ids by *exact* name at runtime, and a movie qualifies
// only if TMDB tags it with at least one of them. If none of a theme's
// keywords exist on TMDB, or too few well-regarded films carry them, the
// theme is not shown — membership is never guessed.

interface ThemeSpec {
  slug: string;
  name: string;
  keywords: string[];
  description: string;
  aliases?: string[];
  /** Extra genre constraint when the keyword alone is too broad. */
  anyGenres?: number[];
  genres?: number[];
}

const SPECS: ThemeSpec[] = [
  { slug: "coming-of-age", name: "Coming of Age", keywords: ["coming of age"], description: "Growing up, figuring it out, and the moments that change everything.", aliases: ["growing up", "teen"] },
  { slug: "redemption", name: "Redemption", keywords: ["redemption"], description: "Characters fighting their way back to something better.", aliases: ["redeem"] },
  { slug: "revenge", name: "Revenge", keywords: ["revenge", "vengeance"], description: "Scores settled, debts repaid — cinema's great revenge stories.", aliases: ["vengeance", "payback"] },
  { slug: "survival", name: "Survival", keywords: ["survival"], description: "Stranded, hunted, or cut off — stories of staying alive.", aliases: ["stranded", "survive"] },
  { slug: "second-chances", name: "Second Chances", keywords: ["second chance"], description: "Starting over when life offers one more shot.", aliases: ["starting over"] },
  { slug: "underdog", name: "Underdog Stories", keywords: ["underdog"], description: "Nobody expected them to win.", aliases: ["underdogs"] },
  { slug: "friendship", name: "Friendship", keywords: ["friendship"], description: "Stories about the friends who make us who we are.", aliases: ["friends", "buddy"] },
  { slug: "family-ties", name: "Family Ties", keywords: ["family relationships", "family conflict"], description: "Parents, siblings, and the bonds (and fractures) between them.", aliases: ["family drama"], genres: [GENRE.drama] },
  { slug: "love-stories", name: "Love Stories", keywords: ["love", "falling in love"], description: "Romance in all its forms, as TMDB's own tagging finds it.", aliases: ["love stories", "romance"], anyGenres: [GENRE.romance] },
  { slug: "heists", name: "Heists", keywords: ["heist"], description: "The plan, the crew, the job — the best heist films.", aliases: ["heist", "robbery", "caper"] },
  { slug: "road-trips", name: "Road Trips", keywords: ["road trip", "road movie"], description: "Stories told from the driver's seat.", aliases: ["road trip", "road movie"] },
  { slug: "time-travel", name: "Time Travel", keywords: ["time travel", "time loop"], description: "Paradoxes, loops, and second attempts at the past.", aliases: ["time loop", "time machine"] },
  { slug: "alternate-worlds", name: "Alternate Worlds", keywords: ["parallel world", "alternate reality", "parallel universe"], description: "Other realities, parallel universes, and worlds just slightly off from ours.", aliases: ["parallel universe", "multiverse"] },
  { slug: "against-the-odds", name: "Against the Odds", keywords: ["overcoming adversity", "against the odds"], description: "Characters who push through when everything says stop.", aliases: ["adversity", "inspiring"] },
  { slug: "hidden-identity", name: "Hidden Identity", keywords: ["secret identity", "double life", "undercover"], description: "Double lives, secret identities, and people pretending to be someone else.", aliases: ["undercover", "double life"] },
  { slug: "rise-to-fame", name: "Rise to Fame", keywords: ["rise to fame", "fame"], description: "Talent, ambition, and the cost of making it big.", aliases: ["fame", "stardom"] },
  { slug: "fall-from-power", name: "Fall from Power", keywords: ["rise and fall", "fall from grace"], description: "Empires, careers, and kingdoms coming apart.", aliases: ["downfall", "rise and fall"] },
  { slug: "detective-stories", name: "Detective Stories", keywords: ["detective", "investigation"], description: "Investigators on the case — from noir to modern procedurals.", aliases: ["detective", "investigation", "noir"], anyGenres: [GENRE.crime, GENRE.mystery] },
  { slug: "political-thrillers", name: "Political Thrillers", keywords: ["political thriller", "conspiracy", "politics"], description: "Power, conspiracy, and the people who expose it.", aliases: ["conspiracy", "politics"], anyGenres: [GENRE.thriller, GENRE.drama] },
  { slug: "courtroom-drama", name: "Courtroom Drama", keywords: ["courtroom", "courtroom drama", "trial"], description: "Cases, verdicts, and the drama of the courtroom.", aliases: ["courtroom", "legal", "trial"] },
];

export const THEME_JOURNEYS: JourneyDefinition[] = SPECS.map((spec) => ({
  id: `theme-${spec.slug}`,
  type: "theme",
  name: spec.name,
  shortName: spec.name,
  description: spec.description,
  aliases: [spec.name.toLowerCase(), ...(spec.aliases ?? [])],
  source: { kind: "keyword", keywords: spec.keywords, sortBy: "vote_count.desc", pages: 2 },
  rules: {
    // Documentaries and TV movies would read as unrelated in a story-theme path.
    excludeGenres: [GENRE.documentary, GENRE.tvMovie],
    ...(spec.genres ? { genres: spec.genres } : {}),
    ...(spec.anyGenres ? { anyGenres: spec.anyGenres } : {}),
    minVotes: 400,
    minRating: 6.8,
    minRuntime: 60,
  },
  ranking: { quality: 0.55, consensus: 0.35, popularity: 0.1 },
  selection: { maxMovies: 15, perDecadeCap: 4 },
  minimumMovies: 8,
  freshness: "daily",
}));
