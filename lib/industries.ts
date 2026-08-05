// TMDB has no "industry" field — original language is the closest
// reliable proxy it exposes, so each named industry maps to a language
// code. "Other" has no language (handled as an exclusion filter instead)
// since it's a catch-all, not a single discover query.
export const INDUSTRIES = [
  { id: "tollywood", label: "Tollywood", sublabel: "Telugu cinema", language: "te" },
  { id: "bollywood", label: "Bollywood", sublabel: "Hindi cinema", language: "hi" },
  { id: "kollywood", label: "Kollywood", sublabel: "Tamil cinema", language: "ta" },
  { id: "mollywood", label: "Mollywood", sublabel: "Malayalam cinema", language: "ml" },
  { id: "hollywood", label: "Hollywood", sublabel: "English cinema", language: "en" },
  { id: "other", label: "Other", sublabel: "Everything else", language: null },
] as const;

export type IndustryId = (typeof INDUSTRIES)[number]["id"];
type IndustryLanguage = (typeof INDUSTRIES)[number]["language"];

/** Languages already covered by a named tab — "Other" excludes these. */
export const NAMED_INDUSTRY_LANGUAGES: string[] = INDUSTRIES.map((i) => i.language).filter(
  (lang): lang is Exclude<IndustryLanguage, null> => lang !== null
);
