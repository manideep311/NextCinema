import "server-only";
import { NextResponse } from "next/server";
import type { ZodType, ZodTypeDef } from "zod";
import { checkRateLimit, type RateLimitPolicyName } from "@/lib/rate-limit";

// Shared request/response plumbing for Route Handlers: consistent JSON
// errors, bounded + validated JSON bodies, a same-origin guard for
// state-changing requests, and rate limiting. Every handler composes these
// instead of re-implementing its own checks.

/** User-specific responses must never be stored by a shared cache/CDN. */
export const PRIVATE_NO_STORE = { "Cache-Control": "private, no-store" } as const;

export function jsonError(status: number, error: string, headers?: HeadersInit): NextResponse {
  return NextResponse.json({ error }, { status, headers });
}

const DEFAULT_MAX_BODY_BYTES = 2 * 1024;

type ParseResult<T> = { ok: true; data: T } | { ok: false; response: NextResponse };

async function readBodyWithLimit(request: Request, maxBytes: number): Promise<string | null> {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(merged);
}

/**
 * Reads a JSON body with a hard size cap, then validates it against a
 * schema. Rejects wrong content types, oversized bodies, malformed JSON,
 * and unexpected shapes before any service code runs.
 */
export async function parseJsonBody<T>(
  request: Request,
  schema: ZodType<T, ZodTypeDef, unknown>,
  maxBytes = DEFAULT_MAX_BODY_BYTES
): Promise<ParseResult<T>> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return { ok: false, response: jsonError(415, "Expected a JSON request body.") };
  }

  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    return { ok: false, response: jsonError(413, "Request body is too large.") };
  }

  const text = await readBodyWithLimit(request, maxBytes).catch(() => null);
  if (text === null) {
    return { ok: false, response: jsonError(413, "Request body is too large.") };
  }

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, response: jsonError(400, "Malformed JSON body.") };
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return { ok: false, response: jsonError(400, parsed.error.issues[0]?.message ?? "Invalid request body.") };
  }
  return { ok: true, data: parsed.data };
}

/**
 * CSRF defense-in-depth for state-changing requests (the session cookie is
 * already SameSite=Lax). Browsers send `Sec-Fetch-Site` on every request;
 * older ones at least send `Origin` on POST/DELETE. A request carrying
 * neither header isn't coming from a browser page, so it can't be riding a
 * victim's cookies and is allowed through.
 */
export function isSameOriginRequest(request: Request): boolean {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite) return fetchSite === "same-origin" || fetchSite === "none";

  const origin = request.headers.get("origin");
  if (!origin) return true;

  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function rejectCrossSite(request: Request): NextResponse | null {
  return isSameOriginRequest(request) ? null : jsonError(403, "Cross-site request blocked.");
}

/**
 * Best-effort client IP. Behind Vercel/most proxies the first
 * `x-forwarded-for` entry is the client; locally there's no proxy, so the
 * header may be absent and every request shares the "local" bucket.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  if (first) return first.slice(0, 64);
  return request.headers.get("x-real-ip")?.trim().slice(0, 64) || "local";
}

/**
 * Applies a named rate-limit policy. `identity` defaults to the client IP;
 * authenticated routes pass the user id instead so a shared NAT doesn't
 * throttle unrelated users. Returns a ready 429 response when exceeded.
 */
export function enforceRateLimit(
  request: Request,
  policy: RateLimitPolicyName,
  identity?: string
): NextResponse | null {
  const result = checkRateLimit(policy, identity ?? getClientIp(request));
  if (result.allowed) return null;
  return jsonError(429, "Too many requests — please slow down and try again shortly.", {
    "Retry-After": String(result.retryAfterSeconds),
  });
}
