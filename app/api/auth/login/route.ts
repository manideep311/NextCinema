import { NextResponse, type NextRequest } from "next/server";
import { authenticateUser, InvalidCredentialsError } from "@/services/auth";
import { attachSessionCookie } from "@/lib/auth/session";
import { loginSchema } from "@/lib/auth/schemas";
import { enforceRateLimit, getClientIp, jsonError, parseJsonBody, PRIVATE_NO_STORE, rejectCrossSite } from "@/lib/http";

export async function POST(request: NextRequest) {
  const crossSite = rejectCrossSite(request);
  if (crossSite) return crossSite;

  const limited = enforceRateLimit(request, "auth:login");
  if (limited) return limited;

  const body = await parseJsonBody(request, loginSchema);
  if (!body.ok) return body.response;

  // Second, tighter bucket per (IP, email) so one account can't be guessed at from one address.
  const perAccount = enforceRateLimit(request, "auth:login-account", `${getClientIp(request)}|${body.data.email}`);
  if (perAccount) return perAccount;

  try {
    const user = await authenticateUser(body.data.email, body.data.password);
    const response = NextResponse.json({ user }, { headers: PRIVATE_NO_STORE });
    await attachSessionCookie(response, { userId: user.id, email: user.email, name: user.name, role: user.role });
    return response;
  } catch (error) {
    if (error instanceof InvalidCredentialsError) {
      return jsonError(401, error.message, PRIVATE_NO_STORE);
    }
    // Never echo internal errors (or anything derived from the credentials) to the client.
    return jsonError(500, "Could not sign in right now — please try again.", PRIVATE_NO_STORE);
  }
}
