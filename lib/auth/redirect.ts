const DEFAULT_REDIRECT = "/dashboard";
const PLACEHOLDER_ORIGIN = "http://nextcinema.invalid";

/**
 * Turns an untrusted `?redirect=` value into a safe same-site path.
 * Without this, `/login?redirect=//evil.example` (or an absolute URL)
 * would send a user off-site right after they sign in — an open redirect.
 * Only relative paths that resolve to this origin survive; everything else
 * (including redirects back to the auth pages themselves) falls back.
 */
export function sanitizeRedirect(value: string | null | undefined, fallback: string = DEFAULT_REDIRECT): string {
  if (!value || value.length > 512) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;

  try {
    const url = new URL(value, PLACEHOLDER_ORIGIN);
    if (url.origin !== PLACEHOLDER_ORIGIN) return fallback;
    if (url.pathname === "/login" || url.pathname === "/signup") return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
