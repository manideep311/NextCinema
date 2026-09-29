import { LayoutDashboard, Compass, Heart, Clock, Sparkles, Bookmark, Search, Route } from "lucide-react";
import type { NavItem } from "@/types/navigation";
import { isProtectedPath } from "@/lib/auth/protected-routes";

// Central nav config — Sidebar and TopNav both read from this single
// source. `requiresAuth` is derived from lib/auth/protected-routes.ts (the
// same list proxy.ts and the pages enforce), so the nav can't drift out of
// sync with what's actually gated.
//
// "Categories" isn't listed: industry selection happens on the Overview
// (components/features/dashboard/industry-selector.tsx). The
// /dashboard/categories route still works, and its /api/movies/by-industry
// endpoint is reused by the Poster Puzzle.
const NAV_ITEMS: Omit<NavItem, "requiresAuth">[] = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Search", href: "/dashboard/search", icon: Search },
  { label: "Recommendations", href: "/dashboard/recommendations", icon: Sparkles },
  { label: "Journeys", href: "/dashboard/journeys", icon: Route },
  { label: "Trending", href: "/dashboard/trending", icon: Compass },
  { label: "Favorites", href: "/dashboard/favorites", icon: Heart },
  { label: "Watchlist", href: "/dashboard/watchlist", icon: Bookmark },
  { label: "Recently Viewed", href: "/dashboard/recent", icon: Clock },
];

export const DASHBOARD_NAV_ITEMS: NavItem[] = NAV_ITEMS.map((item) => ({
  ...item,
  requiresAuth: isProtectedPath(item.href),
}));
