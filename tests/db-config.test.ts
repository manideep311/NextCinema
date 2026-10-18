import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_DB_NAME, databaseName } from "@/lib/db/config";

test("database name defaults to nextcinema and honours MONGODB_DB", () => {
  assert.equal(DEFAULT_DB_NAME, "nextcinema");
  assert.equal(databaseName({}), "nextcinema");
  assert.equal(databaseName({ MONGODB_DB: "" }), "nextcinema");
  assert.equal(databaseName({ MONGODB_DB: "cinematch" }), "cinematch");
});
