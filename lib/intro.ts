// Opening intro — shared between proxy.ts (marks the session as having
// seen it) and the root layout (decides whether to render it at all).

/** Session cookie (no expiry): set on the first page response of a browsing session. */
export const INTRO_COOKIE = "nc_intro_seen";

/**
 * Request header proxy.ts sets (and strips from client requests) to tell the
 * root layout "this is the session's first page load". A header is used
 * because cookies set in the proxy are also visible to the same request's
 * render, so the layout can't use the cookie itself to detect a first visit.
 */
export const INTRO_HEADER = "x-nc-intro";

/** Total timeline length — must match the CSS keyframes in app/globals.css. */
export const INTRO_DURATION_MS = 1600;
