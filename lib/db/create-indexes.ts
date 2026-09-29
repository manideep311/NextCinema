/**
 * Idempotent index setup — MongoDB has no schema migrations to run, but
 * unique indexes still need to be created explicitly. Safe to re-run.
 *
 * Usage: npm run db:indexes   (reads MONGODB_URI / MONGODB_DB from .env / .env.local)
 */
// Relative imports, not the "@/" alias — this file runs standalone via
// `tsx`, outside Next's module resolution. It also avoids ./index.ts
// (which is "server-only") by opening its own short-lived client.
import { MongoClient } from "mongodb";
import { INDEX_SPECS } from "./indexes";

const DEFAULT_DB_NAME = "cinematch";

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set (add it to .env.local).");

  const client = await new MongoClient(uri).connect();
  try {
    const db = client.db(process.env.MONGODB_DB || DEFAULT_DB_NAME);
    for (const [collection, specs] of Object.entries(INDEX_SPECS)) {
      const names = await db.collection(collection).createIndexes(specs);
      console.log(`✓ ${collection}: ${names.join(", ")}`);
    }
    console.log("✓ MongoDB indexes are up to date.");
  } finally {
    await client.close();
  }
}

main().catch((error: unknown) => {
  // Only the error message — never the connection string.
  console.error("Failed to create indexes:", error instanceof Error ? error.message : "unknown error");
  process.exit(1);
});
