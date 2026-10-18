import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { clearUserScopedStorage, readUserScoped, userScopedKey } from "@/lib/local-storage";

class MemoryStorage {
  private items = new Map<string, string>();
  getItem(key: string) {
    return this.items.has(key) ? this.items.get(key)! : null;
  }
  setItem(key: string, value: string) {
    this.items.set(key, value);
  }
  removeItem(key: string) {
    this.items.delete(key);
  }
  keys() {
    return [...this.items.keys()];
  }
}

let storage: MemoryStorage;
beforeEach(() => {
  storage = new MemoryStorage();
  (globalThis as unknown as { window: { localStorage: MemoryStorage } }).window = { localStorage: storage };
});

const USER_ID = "65f0c0ffee0000000000abcd";

test("user-scoped keys use the nextcinema prefix", () => {
  assert.equal(userScopedKey("recent-searches", USER_ID), `nextcinema:recent-searches:${USER_ID}`);
});

test("a value saved under the pre-rename key is migrated on first read", () => {
  storage.setItem(`cinematch:recent-searches:${USER_ID}`, JSON.stringify(["heist", "noir"]));

  assert.deepEqual(readUserScoped<string[]>("recent-searches", USER_ID), ["heist", "noir"]);
  assert.deepEqual(storage.keys(), [`nextcinema:recent-searches:${USER_ID}`]);
});

test("the new key wins when both exist", () => {
  storage.setItem(`nextcinema:recent-searches:${USER_ID}`, JSON.stringify(["new"]));
  storage.setItem(`cinematch:recent-searches:${USER_ID}`, JSON.stringify(["old"]));
  assert.deepEqual(readUserScoped<string[]>("recent-searches", USER_ID), ["new"]);
});

test("sign-out clears current, pre-rename and pre-scoping keys", () => {
  storage.setItem(`nextcinema:recent-searches:${USER_ID}`, "[]");
  storage.setItem(`cinematch:recent-searches:${USER_ID}`, "[]");
  storage.setItem("cinematch:recent-searches", "[]");
  clearUserScopedStorage(USER_ID);
  assert.deepEqual(storage.keys(), []);
});
