import { LayoutDashboard, Compass, Heart, Clock, Sparkles } from "lucide-react";
import type { NavItem } from "@/types/navigation";

// Central nav config — Sidebar and any future mobile nav both read from
// this single source, so adding/reordering a dashboard section never
// requires touching more than one file.
export const DASHBOARD_NAV_ITEMS: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Recommendations", href: "/dashboard/recommendations", icon: Sparkles },
  { label: "Trending", href: "/dashboard/trending", icon: Compass },
  { label: "Favorites", href: "/dashboard/favorites", icon: Heart },
  { label: "Recently Viewed", href: "/dashboard/recent", icon: Clock },
];