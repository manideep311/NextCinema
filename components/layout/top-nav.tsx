"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Search, Film } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DASHBOARD_NAV_ITEMS } from "@/lib/navigation";

/**
 * Top bar for the dashboard. Handles both: (1) the search entry point,
 * shown on all breakpoints, and (2) full mobile navigation, since
 * Sidebar hides itself below md.
 */
export function TopNav() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 glass px-4 md:px-8 py-3 flex items-center justify-between">
      <Link href="/" className="md:hidden flex items-center gap-2 font-heading font-bold">
        <Film className="size-5 text-primary" />
        CineMatch <span className="gradient-text">AI</span>
      </Link>

      <div className="hidden md:flex items-center gap-2 glass rounded-xl px-4 py-2 w-full max-w-md">
        <Search className="size-4 text-muted" />
        <input
          type="text"
          placeholder="Search movies..."
          className="bg-transparent outline-none text-sm w-full placeholder:text-muted"
        />
      </div>

      <div className="flex items-center gap-4">
        <Avatar className="size-8">
          <AvatarFallback className="bg-primary/20 text-primary text-sm">U</AvatarFallback>
        </Avatar>

        <button
          className="md:hidden text-text"
          onClick={() => setIsMobileMenuOpen((open) => !open)}
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="md:hidden absolute top-full left-0 right-0 glass border-t border-white/10 px-4 py-4 flex flex-col gap-1"
          >
            {DASHBOARD_NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm ${
                    isActive ? "bg-primary/15 text-text font-medium" : "text-muted"
                  }`}
                >
                  <item.icon className="size-4.5" />
                  {item.label}
                </Link>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}