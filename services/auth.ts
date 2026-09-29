import "server-only";
import { ObjectId } from "mongodb";
import { getUsersCollection, isDuplicateKeyError } from "@/lib/db";
import type { UserDoc } from "@/lib/db/schema";
import { getDummyPasswordHash, hashPassword, needsRehash, verifyPassword } from "@/lib/auth/password";
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

export class AccountUnavailableError extends Error {
  constructor() {
    super("Could not create an account with those details.");
    this.name = "AccountUnavailableError";
  }
}

function toPublicUser(doc: Pick<UserDoc, "_id" | "email" | "name" | "role">): PublicUser {
  return { id: doc._id.toString(), email: doc.email, name: doc.name, role: doc.role };
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Creates an account. Uniqueness is enforced by the `email` unique index —
 * a concurrent duplicate signup loses the race at the database, not in app
 * code — and the error surfaced to the client doesn't name the reason.
 */
export async function createUser(params: { email: string; password: string; name: string }): Promise<PublicUser> {
  const users = await getUsersCollection();
  const email = normalizeEmail(params.email);

  // Cheap indexed pre-check so the common "already registered" case skips
  // the scrypt cost; the unique index below remains the real guarantee.
  if (await users.findOne({ email }, { projection: { _id: 1 } })) {
    throw new AccountUnavailableError();
  }

  const doc: UserDoc = {
    _id: new ObjectId(),
    email,
    passwordHash: await hashPassword(params.password),
    name: params.name,
    avatarUrl: null,
    role: "user",
    createdAt: new Date(),
  };

  try {
    await users.insertOne(doc);
  } catch (error) {
    if (isDuplicateKeyError(error)) throw new AccountUnavailableError();
    throw error;
  }
  return toPublicUser(doc);
}

export async function authenticateUser(emailInput: string, password: string): Promise<PublicUser> {
  const users = await getUsersCollection();
  const doc = await users.findOne(
    { email: normalizeEmail(emailInput) },
    { projection: { _id: 1, email: 1, name: 1, role: 1, passwordHash: 1 } }
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

  return toPublicUser(doc);
}
