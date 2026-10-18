import { NextResponse, type NextRequest } from "next/server";
import { AccountUnavailableError, createUser } from "@/services/auth";
import { attachSessionCookie } from "@/lib/auth/request-session";
import { signupSchema } from "@/lib/auth/schemas";
import { enforceRateLimit, jsonError, parseJsonBody, PRIVATE_NO_STORE, rejectCrossSite } from "@/lib/http";

export async function POST(request: NextRequest) {
  const crossSite = rejectCrossSite(request);
  if (crossSite) return crossSite;

  // Tight per-IP budget: limits both account spam and using signup to probe which emails exist.
  const limited = enforceRateLimit(request, "auth:signup");
  if (limited) return limited;

  const body = await parseJsonBody(request, signupSchema);
  if (!body.ok) return body.response;

  try {
    const user = await createUser(body.data);
    const response = NextResponse.json({ user }, { headers: PRIVATE_NO_STORE });
    await attachSessionCookie(response, { userId: user.id, email: user.email, name: user.name, role: user.role });
    return response;
  } catch (error) {
    if (error instanceof AccountUnavailableError) {
      // Not 409: a distinct "conflict" status would confirm the email is registered.
      // 400 + a generic message reads the same as any other rejected signup.
      return jsonError(400, error.message, PRIVATE_NO_STORE);
    }
    return jsonError(500, "Could not create your account right now — please try again.", PRIVATE_NO_STORE);
  }
}
