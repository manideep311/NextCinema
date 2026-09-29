import { NextResponse, type NextRequest } from "next/server";
import { getRequestSession } from "@/lib/auth/session";
import { PRIVATE_NO_STORE } from "@/lib/http";

/** Who is signed in, straight from the verified cookie (no DB round-trip). Never cached. */
export async function GET(request: NextRequest) {
  const session = await getRequestSession(request);
  const user = session
    ? { id: session.userId, email: session.email, name: session.name, role: session.role }
    : null;
  return NextResponse.json({ user }, { headers: PRIVATE_NO_STORE });
}
