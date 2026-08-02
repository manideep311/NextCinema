"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Film } from "lucide-react";
import { DASHBOARD_NAV_ITEMS } from "@/lib/navigation";

/**
 * Persistent left sidebar for the dashboard. Desktop-only — collapses
 * away below md, where TopNav's mobile menu takes over navigation duty
 * instead (avoids maintaining two full nav UIs simultaneously on mobile).
 */
export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 border-r border-white/10 px-4 py-6">
      <Link href="/" className="flex items-center gap-2 font-heading font-bold text-lg px-2 mb-8">
        <Film className="size-5 text-primary" />
        CineMatch <span className="gradient-text">AI</span>
      </Link>

      <nav className="flex flex-col gap-1">
        {DASHBOARD_NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors"
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active-bg"
                  className="absolute inset-0 bg-primary/15 rounded-xl"
                  transition={{ duration: 0.25 }}
                />
              )}
              <item.icon
                className={`size-4.5 relative z-10 ${isActive ? "text-primary" : "text-muted"}`}
              />
              <span className={`relative z-10 ${isActive ? "text-text font-medium" : "text-muted"}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}