import { test } from "node:test";
import assert from "node:assert/strict";
import { memoizeConnection, type ConnectionSlot } from "@/lib/db/connection-cache";

test("a failed connect is not cached — the next call retries", async () => {
  const slot: ConnectionSlot<string> = {};
  let attempts = 0;
  const connect = async () => {
    attempts += 1;
    if (attempts === 1) throw new Error("cluster unreachable");
    return "client";
  };

  await assert.rejects(memoizeConnection(slot, connect), /cluster unreachable/);
  // Let the rejection handler clear the slot.
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(slot.current, undefined);

  assert.equal(await memoizeConnection(slot, connect), "client");
  assert.equal(attempts, 2);
});

test("concurrent callers share one attempt, and a success stays cached", async () => {
  const slot: ConnectionSlot<string> = {};
  let attempts = 0;
  const connect = async () => {
    attempts += 1;
    return "client";
  };

  const [a, b] = await Promise.all([memoizeConnection(slot, connect), memoizeConnection(slot, connect)]);
  assert.equal(a, "client");
  assert.equal(b, "client");
  assert.equal(await memoizeConnection(slot, connect), "client");
  assert.equal(attempts, 1);
});

test("a stale rejection never clears a newer attempt", async () => {
  const slot: ConnectionSlot<string> = {};
  let rejectFirst!: (error: Error) => void;
  const first = memoizeConnection(slot, () => new Promise<string>((_, reject) => (rejectFirst = reject)));
  // Simulate the slot having moved on (e.g. reset by another code path).
  slot.current = Promise.resolve("newer");
  rejectFirst(new Error("old failure"));
  await assert.rejects(first);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(await slot.current, "newer");
});
