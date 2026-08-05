import type { LucideIcon } from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Hidden from nav (and the route itself redirects to /login) for signed-out visitors. */
  requiresAuth?: boolean;
}
