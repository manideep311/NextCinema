import { z } from "zod";

// Runtime validation for every API boundary. TypeScript types vanish at
// runtime, so anything arriving from a query string, path segment, or JSON
// body is parsed through one of these schemas before it reaches a service.
// Kept free of server-only imports so it's unit-testable in plain Node.

/** TMDB ids are positive int32 values — anything larger is not a real movie. */
export const MAX_TMDB_ID = 2_147_483_647;

/** TMDB's discover/search endpoints reject pages above 500. */
export const MAX_TMDB_PAGE = 500;

export const MAX_SEARCH_QUERY_LENGTH = 100;

/** A movie id arriving as a URL/path string: digits only, no signs, exponents, or leading zeros. */
export const movieIdParamSchema = z
  .string()
  .regex(/^[1-9]\d{0,9}$/, "Invalid movie id")
  .transform(Number)
  .refine((id) => id <= MAX_TMDB_ID, "Invalid movie id");

/** A movie id inside a JSON body. */
export const movieIdValueSchema = z
  .number({ invalid_type_error: "Invalid movie id" })
  .int("Invalid movie id")
  .positive("Invalid movie id")
  .max(MAX_TMDB_ID, "Invalid movie id");

export const pageParamSchema = z
  .string()
  .regex(/^\d{1,3}$/, "Invalid page")
  .transform(Number)
  .refine((page) => page >= 1 && page <= MAX_TMDB_PAGE, "Invalid page");

export const searchQuerySchema = z
  .string()
  .trim()
  .min(2, "Search query is too short")
  .max(MAX_SEARCH_QUERY_LENGTH, "Search query is too long");

/** Journey ids are lowercase slugs (`mcu-infinity-saga`, `mood-feel-good`). */
export const journeyIdSchema = z
  .string()
  .max(80, "Invalid journey id")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid journey id");

export const journeyOrderSchema = z.enum(["release", "chronological", "essential"]);

/** Bounded integer limit parameter, e.g. `?limit=10`. */
export function limitParamSchema(max: number) {
  return z
    .string()
    .regex(/^\d{1,3}$/, "Invalid limit")
    .transform(Number)
    .refine((limit) => limit >= 1 && limit <= max, "Invalid limit");
}

/** Body for favorites/watchlist/history writes — only the id is accepted;
 *  the server resolves the movie snapshot itself (never trusting client-sent titles/posters). */
export const movieRefBodySchema = z.object({ movieId: movieIdValueSchema }).strict();

export const watchedBodySchema = z
  .object({
    movieId: movieIdValueSchema,
    journeyId: journeyIdSchema.nullable().optional(),
  })
  .strict();

/** Parses a single optional query-string value, returning `fallback` when absent. */
export function parseOptionalParam<T>(
  value: string | null,
  schema: z.ZodType<T, z.ZodTypeDef, string>,
  fallback: T
): { ok: true; value: T } | { ok: false; error: string } {
  if (value === null || value === "") return { ok: true, value: fallback };
  const parsed = schema.safeParse(value);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid parameter" };
  return { ok: true, value: parsed.data };
}
