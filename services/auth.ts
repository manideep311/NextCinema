import "server-only";
import { ObjectId } from "mongodb";
import { getUsersCollection } from "@/lib/db";
import type { UserDoc } from "@/lib/db/schema";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: "user" | "premium" | "admin";
}

function toPublicUser(doc: UserDoc): PublicUser {
  return { id: doc._id.toString(), email: doc.email, name: doc.name, avatarUrl: doc.avatarUrl, role: doc.role };
}

export async function findUserByEmail(email: string) {
  const users = await getUsersCollection();
  return users.findOne({ email: email.toLowerCase() });
}

export async function createUser(params: {
  email: string;
  password: string;
  name: string;
}): Promise<PublicUser> {
  const users = await getUsersCollection();
  const email = params.email.toLowerCase();

  const existing = await users.findOne({ email });
  if (existing) {
    throw new Error("An account with this email already exists.");
  }

  const passwordHash = await hashPassword(params.password);
  const doc: UserDoc = {
    _id: new ObjectId(),
    email,
    passwordHash,
    name: params.name,
    avatarUrl: null,
    role: "user",
    createdAt: new Date(),
  };

  await users.insertOne(doc);
  return toPublicUser(doc);
}

export async function authenticateUser(email: string, password: string): Promise<PublicUser> {
  const doc = await findUserByEmail(email);
  if (!doc) {
    throw new Error("Invalid email or password.");
  }

  const valid = await verifyPassword(password, doc.passwordHash);
  if (!valid) {
    throw new Error("Invalid email or password.");
  }

  return toPublicUser(doc);
}

export async function getUserById(id: string): Promise<PublicUser | null> {
  if (!ObjectId.isValid(id)) return null;

  const users = await getUsersCollection();
  const doc = await users.findOne({ _id: new ObjectId(id) });
  return doc ? toPublicUser(doc) : null;
}
