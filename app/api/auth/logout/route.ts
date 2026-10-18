import { NextResponse, type NextRequest } from "next/server";
import { clearSessionCookie, getRequestSession } from "@/lib/auth/request-session";
import { revokeSessions } from "@/services/auth";
import { PRIVATE_NO_STORE, rejectCrossSite } from "@/lib/http";

export async function POST(request: NextRequest) {
  const crossSite = rejectCrossSite(request);
  if (crossSite) return crossSite;

  // Revoke server-side first, so a copied token stops working too, not just
  // this browser's cookie. Best effort: if the database is down, the cookie
  // is still cleared and the token expires on its own.
  const session = await getRequestSession(request);
  if (session) await revokeSessions(session.userId).catch(() => {});

  const response = NextResponse.json({ ok: true }, { headers: PRIVATE_NO_STORE });
  clearSessionCookie(response);
  return response;
}
