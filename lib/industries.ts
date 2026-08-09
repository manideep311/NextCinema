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

/**
 * The five industries the Overview's industry selector shows — a fixed,
 * ordered subset of `INDUSTRIES` (excluding the "Other" catch-all, which
 * only makes sense in the Categories tab's exhaustive browse, not the
 * curated Overview). This is the single source of truth for that order;
 * nothing else should hardcode industry id strings or their sequence.
 */
export const PRIMARY_INDUSTRY_IDS = [
  "hollywood",
  "bollywood",
  "tollywood",
  "kollywood",
  "mollywood",
] as const satisfies readonly IndustryId[];

export type PrimaryIndustryId = (typeof PRIMARY_INDUSTRY_IDS)[number];

type IndustryConfig = (typeof INDUSTRIES)[number];

// Rebuilds each entry with `id` explicitly typed as PrimaryIndustryId
// (rather than the full IndustryId union, which still includes "other")
// so callers can pass `industry.id` straight into anything typed to
// accept only the five primary industries, with no cast needed.
export const PRIMARY_INDUSTRIES: (Omit<IndustryConfig, "id"> & { id: PrimaryIndustryId })[] =
  PRIMARY_INDUSTRY_IDS.map((id) => ({ ...INDUSTRIES.find((industry) => industry.id === id)!, id }));

export const DEFAULT_PRIMARY_INDUSTRY: PrimaryIndustryId = "hollywood";

/** Server-safe validation for untrusted input (query params, etc.) — never
 *  trust a client-supplied industry string directly. */
export function isPrimaryIndustryId(value: string | null | undefined): value is PrimaryIndustryId {
  return PRIMARY_INDUSTRY_IDS.includes(value as PrimaryIndustryId);
}
