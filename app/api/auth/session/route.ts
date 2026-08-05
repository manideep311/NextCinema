import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";

/** Used by the client-side AuthProvider to know whether anyone is signed in, without a full DB round-trip. */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({
    user: { id: session.userId, email: session.email, name: session.name, role: session.role },
  });
}
