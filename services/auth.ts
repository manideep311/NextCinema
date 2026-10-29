import "server-only";
import { ObjectId } from "mongodb";
import { getUsersCollection, isDuplicateKeyError, userObjectId } from "@/lib/db";
import type { UserDoc } from "@/lib/db/schema";
import { getDummyPasswordHash, hashPassword, needsRehash, verifyPassword } from "@/lib/auth/password";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/password-policy";
import type { UserRole } from "@/lib/auth/token";

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

/** Wrong email *or* wrong password — deliberately indistinguishable. */
export class InvalidCredentialsError extends Error {
  constructor() {
    super("Invalid email or password.");
    this.name = "InvalidCredentialsError";
  }
}

/**
 * The one message for every rejected signup — taken email *and* invalid
 * input — so the response never says which it was
 * (see app/api/auth/signup/route.ts).
 */
export const SIGNUP_REJECTED_MESSAGE = `Couldn't create an account with those details. Check your name, email and password (at least ${PASSWORD_MIN_LENGTH} characters), or sign in if you already have an account.`;

/** Signup refused because the email is taken; reported with SIGNUP_REJECTED_MESSAGE. */
export class AccountUnavailableError extends Error {
  constructor() {
    super(SIGNUP_REJECTED_MESSAGE);
    this.name = "AccountUnavailableError";
  }
}

function toPublicUser(doc: Pick<UserDoc, "_id" | "email" | "name" | "role">): PublicUser {
  return { id: doc._id.toString(), email: doc.email, name: doc.name, role: doc.role };
}

/** A signed-in user plus the token version their session must carry. */
export interface AuthenticatedUser {
  user: PublicUser;
  tokenVersion: number;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Creates an account. Uniqueness is enforced by the `email` unique index —
 * a concurrent duplicate signup loses the race at the database, not in app
 * code — and the error surfaced to the client doesn't name the reason.
 *
 * The password is hashed *before* checking whether the email is taken, so
 * a taken email costs the same scrypt work as a new account and response
 * time doesn't reveal which emails are registered.
 */
export async function createUser(params: { email: string; password: string; name: string }): Promise<AuthenticatedUser> {
  const users = await getUsersCollection();
  const email = normalizeEmail(params.email);

  const passwordHash = await hashPassword(params.password);
  // Indexed pre-check (after hashing, see above); the unique index below remains the real guarantee.
  if (await users.findOne({ email }, { projection: { _id: 1 } })) {
    throw new AccountUnavailableError();
  }

  const doc: UserDoc = {
    _id: new ObjectId(),
    email,
    passwordHash,
    name: params.name,
    avatarUrl: null,
    role: "user",
    createdAt: new Date(),
    tokenVersion: 0,
  };

  try {
    await users.insertOne(doc);
  } catch (error) {
    if (isDuplicateKeyError(error)) throw new AccountUnavailableError();
    throw error;
  }
  return { user: toPublicUser(doc), tokenVersion: 0 };
}

export async function authenticateUser(emailInput: string, password: string): Promise<AuthenticatedUser> {
  const users = await getUsersCollection();
  const doc = await users.findOne(
    { email: normalizeEmail(emailInput) },
    { projection: { _id: 1, email: 1, name: 1, role: 1, passwordHash: 1, tokenVersion: 1 } }
  );

  if (!doc) {
    // Pay the same scrypt cost as a real comparison so response timing
    // doesn't reveal which emails are registered.
    await verifyPassword(password, await getDummyPasswordHash());
    throw new InvalidCredentialsError();
  }

  if (!(await verifyPassword(password, doc.passwordHash))) {
    throw new InvalidCredentialsError();
  }

  // Transparently upgrade hashes created with older parameters/format.
  if (needsRehash(doc.passwordHash)) {
    await users.updateOne({ _id: doc._id }, { $set: { passwordHash: await hashPassword(password) } });
  }

  return { user: toPublicUser(doc), tokenVersion: doc.tokenVersion ?? 0 };
}

/** The user's current token version, or null if the account no longer exists. */
export async function getTokenVersion(userId: string): Promise<number | null> {
  const users = await getUsersCollection();
  const doc = await users.findOne({ _id: userObjectId(userId) }, { projection: { _id: 0, tokenVersion: 1 } });
  return doc ? (doc.tokenVersion ?? 0) : null;
}

/**
 * Whether a verified token still matches its account: "current", "revoked"
 * (the user signed out since it was issued, or the account is gone), or
 * "unknown" when the lookup itself failed — callers decide whether to
 * fail open or closed.
 */
export async function checkSessionVersion(session: { userId: string; tokenVersion: number }): Promise<"current" | "revoked" | "unknown"> {
  try {
    const version = await getTokenVersion(session.userId);
    return version === session.tokenVersion ? "current" : "revoked";
  } catch {
    return "unknown";
  }
}

/**
 * Revokes every session the user has: tokens carry the version they were
 * issued with; API routes reject one whose version is behind and proxy.ts
 * refuses to renew it.
 * Called on sign-out. (There is no password-change flow yet; one should
 * call this too.)
 */
export async function revokeSessions(userId: string): Promise<void> {
  const users = await getUsersCollection();
  await users.updateOne({ _id: userObjectId(userId) }, { $inc: { tokenVersion: 1 } });
}
