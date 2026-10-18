// No "server-only" here: lib/db/create-indexes.ts imports this when it
// runs standalone under tsx.

/**
 * Database used when MONGODB_DB is unset. It was "cinematch" before the
 * rename — a deployment that relied on that default must now set
 * MONGODB_DB=cinematch to keep reading its existing data.
 */
export const DEFAULT_DB_NAME = "nextcinema";

export function databaseName(env: Record<string, string | undefined> = process.env): string {
  return env.MONGODB_DB || DEFAULT_DB_NAME;
}
