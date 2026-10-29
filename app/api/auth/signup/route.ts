import { NextResponse, type NextRequest } from "next/server";
import { AccountUnavailableError, createUser, SIGNUP_REJECTED_MESSAGE } from "@/services/auth";
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
  // Invalid input gets exactly the same 400 and message as a taken email, so
  // a probe can't tell "this email is registered" from "this request was bad".
  // (The form validates fields in the browser first.) 413/415 pass through.
  if (!body.ok) return body.response.status === 400 ? jsonError(400, SIGNUP_REJECTED_MESSAGE, PRIVATE_NO_STORE) : body.response;

  try {
    const { user, tokenVersion } = await createUser(body.data);
    const response = NextResponse.json({ user }, { headers: PRIVATE_NO_STORE });
    await attachSessionCookie(response, { userId: user.id, email: user.email, name: user.name, role: user.role, tokenVersion });
    return response;
  } catch (error) {
    if (error instanceof AccountUnavailableError) {
      // Not 409: a distinct "conflict" status would confirm the email is registered.
      return jsonError(400, SIGNUP_REJECTED_MESSAGE, PRIVATE_NO_STORE);
    }
    return jsonError(500, "Could not create your account right now — please try again.", PRIVATE_NO_STORE);
  }
}
