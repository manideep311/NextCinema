import { LayoutDashboard, Compass, Heart, Clock, Sparkles, Bookmark, Search, Route } from "lucide-react";
import type { NavItem } from "@/types/navigation";

// Central nav config — Sidebar and any future mobile nav both read from
// this single source, so adding/reordering a dashboard section never
// requires touching more than one file.
//
// "Categories" was removed from here deliberately: industry selection now
// happens directly on the Overview (see components/features/dashboard/
// industry-selector.tsx), so browsing by industry no longer needs its own
// nav destination. /dashboard/categories itself still exists and still
// works — components/features/assistant/poster-puzzle reuses its
// underlying /api/movies/by-industry endpoint — it's just no longer
// linked from primary navigation.
export const DASHBOARD_NAV_ITEMS: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Search", href: "/dashboard/search", icon: Search },
  { label: "Recommendations", href: "/dashboard/recommendations", icon: Sparkles, requiresAuth: true },
  { label: "Journeys", href: "/dashboard/journeys", icon: Route },
  { label: "Trending", href: "/dashboard/trending", icon: Compass },
  { label: "Favorites", href: "/dashboard/favorites", icon: Heart, requiresAuth: true },
  { label: "Watchlist", href: "/dashboard/watchlist", icon: Bookmark, requiresAuth: true },
  { label: "Recently Viewed", href: "/dashboard/recent", icon: Clock, requiresAuth: true },
];
