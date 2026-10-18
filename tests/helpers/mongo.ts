import { MongoMemoryServer } from "mongodb-memory-server";

let server: MongoMemoryServer | undefined;

/**
 * Starts a throwaway in-memory MongoDB and points MONGODB_URI / MONGODB_DB
 * at it (lib/db reads both lazily, on first use). Call from the test
 * file's `before` hook and pair it with `stopTestDatabase` in `after`.
 * Each test file runs in its own process, so files never share a database.
 */
export async function startTestDatabase(): Promise<void> {
  server = await MongoMemoryServer.create();
  process.env.MONGODB_URI = server.getUri();
  process.env.MONGODB_DB = "nextcinema-test";
}

/** Closes the app's shared client (so the process can exit) and stops the server. */
export async function stopTestDatabase(): Promise<void> {
  const { closeDb } = await import("@/lib/db");
  await closeDb();
  await server?.stop();
  server = undefined;
}
