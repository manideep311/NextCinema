import "server-only";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual, type ScryptOptions } from "node:crypto";

// Password hashing with scrypt from `node:crypto` — memory-hard, salted,
// and dependency-free (no native bcrypt/argon2 build step).
//
// Stored format (self-describing, so parameters can be raised later
// without breaking existing hashes):
//   scrypt$<N>$<r>$<p>$<saltBase64>$<keyBase64>
// Hashes written before this format existed look like `<saltHex>:<keyHex>`
// (Node's default N=16384, r=8, p=1). They still verify, and
// `needsRehash` flags them so login can upgrade them transparently.

const KEY_LENGTH = 64;
const SALT_BYTES = 16;

/** N=2^15, r=8, p=1 ≈ 32 MiB per hash — a deliberate cost/latency balance for serverless. */
const CURRENT_PARAMS = { N: 2 ** 15, r: 8, p: 1 } as const;
const LEGACY_PARAMS = { N: 2 ** 14, r: 8, p: 1 } as const;

/** Upper bounds accepted when *reading* a stored hash, so a corrupted record can't request unbounded work. */
const MAX_N = 2 ** 20;
const MAX_R = 16;
const MAX_P = 4;

export { PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH } from "@/lib/auth/password-policy";

interface ScryptParams {
  N: number;
  r: number;
  p: number;
}

function scryptAsync(password: string, salt: Buffer, params: ScryptParams): Promise<Buffer> {
  const options: ScryptOptions = {
    N: params.N,
    r: params.r,
    p: params.p,
    // scrypt needs 128·N·r bytes; leave headroom above Node's 32 MiB default.
    maxmem: 128 * params.N * params.r * 2,
  };
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, KEY_LENGTH, options, (error, key) => (error ? reject(error) : resolve(key)));
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const key = await scryptAsync(password, salt, CURRENT_PARAMS);
  const { N, r, p } = CURRENT_PARAMS;
  return `scrypt$${N}$${r}$${p}$${salt.toString("base64")}$${key.toString("base64")}`;
}

interface ParsedHash {
  params: ScryptParams;
  salt: Buffer;
  key: Buffer;
  legacy: boolean;
}

function parseStoredHash(stored: string): ParsedHash | null {
  if (stored.startsWith("scrypt$")) {
    const parts = stored.split("$");
    if (parts.length !== 6) return null;
    const [, nRaw, rRaw, pRaw, saltRaw, keyRaw] = parts;
    const params = { N: Number(nRaw), r: Number(rRaw), p: Number(pRaw) };
    const validParams =
      Number.isInteger(params.N) && params.N > 1 && params.N <= MAX_N && (params.N & (params.N - 1)) === 0 &&
      Number.isInteger(params.r) && params.r >= 1 && params.r <= MAX_R &&
      Number.isInteger(params.p) && params.p >= 1 && params.p <= MAX_P;
    if (!validParams) return null;
    const salt = Buffer.from(saltRaw, "base64");
    const key = Buffer.from(keyRaw, "base64");
    if (salt.length < 8 || key.length !== KEY_LENGTH) return null;
    return { params, salt, key, legacy: false };
  }

  // Legacy `saltHex:keyHex` — note the salt was used as its hex *string*, not decoded bytes.
  const [saltHex, keyHex] = stored.split(":");
  if (!saltHex || !keyHex || !/^[a-f0-9]+$/i.test(saltHex) || !/^[a-f0-9]+$/i.test(keyHex)) return null;
  const key = Buffer.from(keyHex, "hex");
  if (key.length !== KEY_LENGTH) return null;
  return { params: LEGACY_PARAMS, salt: Buffer.from(saltHex, "utf8"), key, legacy: true };
}

/** Constant-time comparison; returns false (never throws) for malformed stored hashes. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parsed = parseStoredHash(stored);
  if (!parsed) return false;

  const derived = await scryptAsync(password, parsed.salt, parsed.params);
  return derived.length === parsed.key.length && timingSafeEqual(derived, parsed.key);
}

/** True when a hash predates the current format/parameters and should be upgraded after a successful login. */
export function needsRehash(stored: string): boolean {
  const parsed = parseStoredHash(stored);
  if (!parsed) return false;
  if (parsed.legacy) return true;
  const { N, r, p } = parsed.params;
  return N !== CURRENT_PARAMS.N || r !== CURRENT_PARAMS.r || p !== CURRENT_PARAMS.p;
}

let dummyHashPromise: Promise<string> | null = null;

/**
 * A real hash (same format and cost as current user hashes) of a random
 * value nobody knows. Login verifies against it when an email isn't
 * registered, so "no such account" costs the same scrypt work as "wrong
 * password" and response timing doesn't reveal which accounts exist.
 */
export function getDummyPasswordHash(): Promise<string> {
  dummyHashPromise ??= hashPassword(randomBytes(32).toString("base64"));
  return dummyHashPromise;
}
