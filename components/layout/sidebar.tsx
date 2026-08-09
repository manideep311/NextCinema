"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { LogOut } from "lucide-react";
import { DASHBOARD_NAV_ITEMS } from "@/lib/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

/**
 * Persistent left sidebar for the dashboard. Desktop-only — collapses
 * away below md, where TopNav's mobile menu takes over navigation duty
 * instead (avoids maintaining two full nav UIs simultaneously on mobile).
 */
export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const navItems = DASHBOARD_NAV_ITEMS.filter((item) => !item.requiresAuth || user);

  return (
    <aside className="hidden md:flex flex-col w-60 h-screen sticky top-0 border-r border-white/[0.06] bg-surface-2 px-4 py-7">
      <Link href="/" className="flex items-center gap-2 font-serif font-semibold text-lg px-2 mb-10 tracking-tight">
        <Logo />
      </Link>

      <nav className="flex flex-col gap-0.5">
        {navItems.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex items-center gap-3 pl-3.5 pr-3 py-2.5 text-sm transition-colors"
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active-bg"
                  className="absolute inset-y-0.5 left-0 w-px bg-primary"
                  transition={{ duration: 0.25 }}
                />
              )}
              <item.icon
                className={`size-4 relative z-10 ${isActive ? "text-primary" : "text-muted"}`}
              />
              <span className={`relative z-10 tracking-wide ${isActive ? "text-text font-medium" : "text-muted"}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-4 border-t border-white/[0.06]">
        {user ? (
          <div className="flex items-center gap-2 px-2">
            <Avatar className="size-8 shrink-0">
              <AvatarFallback className="bg-primary/15 text-primary text-xs">
                {initials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-muted truncate">{user.email}</p>
            </div>
            <button onClick={logout} aria-label="Sign out" className="text-muted hover:text-text shrink-0">
              <LogOut className="size-4" />
            </button>
          </div>
        ) : (
          <Link href="/login" className="block px-2">
            <Button size="sm" variant="outline" className="w-full rounded-lg border-white/10">
              Sign in
            </Button>
          </Link>
        )}
      </div>
    </aside>
  );
}