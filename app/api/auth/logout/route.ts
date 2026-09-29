import { NextResponse, type NextRequest } from "next/server";
import { clearSessionCookie } from "@/lib/auth/session";
import { PRIVATE_NO_STORE, rejectCrossSite } from "@/lib/http";

export async function POST(request: NextRequest) {
  const crossSite = rejectCrossSite(request);
  if (crossSite) return crossSite;

  const response = NextResponse.json({ ok: true }, { headers: PRIVATE_NO_STORE });
  clearSessionCookie(response);
  return response;
}
