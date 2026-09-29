// Single source of truth for which pages require an account. Read by
// proxy.ts (optimistic redirect), lib/navigation.ts (hides the nav items for
// guests), and each page's own server-side session check (the real gate —
// the proxy redirect is only a UX nicety, never the authorization itself).

export const PROTECTED_ROUTE_PREFIXES = [
  "/dashboard/profile",
  "/dashboard/favorites",
  "/dashboard/watchlist",
  "/dashboard/recommendations",
  "/dashboard/recent",
] as const;

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_ROUTE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
