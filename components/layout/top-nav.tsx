"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Menu, X, LogOut, User as UserIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DASHBOARD_NAV_ITEMS } from "@/lib/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { Logo } from "@/components/ui/logo";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/**
 * Mobile-only top bar (logo, account control, hamburger nav). On desktop
 * Sidebar already covers all of this — nav links plus the same account
 * control at its bottom — so this whole header collapses away above the
 * md breakpoint rather than sitting there as a redundant, empty strip.
 */
export function TopNav() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const navItems = DASHBOARD_NAV_ITEMS.filter((item) => !item.requiresAuth || user);

  async function handleLogout() {
    await logout();
    setIsUserMenuOpen(false);
    router.push("/");
  }

  return (
    <header className="md:hidden sticky top-0 z-40 bg-background border-b border-white/[0.06] px-4 py-3 flex items-center">
      <Link href="/" className="md:hidden flex items-center gap-2 font-serif font-semibold">
        <Logo />
      </Link>

      <div className="flex items-center gap-4 relative ml-auto">
        {user ? (
          <button
            onClick={() => setIsUserMenuOpen((open) => !open)}
            className="flex items-center gap-2"
            aria-label="Account menu"
          >
            <Avatar className="size-8">
              <AvatarFallback className="bg-primary/15 text-primary text-sm">
                {initials(user.name)}
              </AvatarFallback>
            </Avatar>
          </button>
        ) : (
          <Link href="/login">
            <Button size="sm" variant="outline" className="rounded-lg border-white/10">
              Sign in
            </Button>
          </Link>
        )}

        <AnimatePresence>
          {isUserMenuOpen && user && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 w-48 glass rounded-lg p-2 z-50"
            >
              <div className="px-3 py-2 border-b border-white/[0.06] mb-1">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <p className="text-xs text-muted truncate">{user.email}</p>
              </div>
              <Link
                href="/dashboard/profile"
                onClick={() => setIsUserMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted hover:bg-white/5 hover:text-text"
              >
                <UserIcon className="size-4" /> Profile
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted hover:bg-white/5 hover:text-text w-full text-left"
              >
                <LogOut className="size-4" /> Sign out
              </button>
            </motion.div>
          )}
        </AnimatePresence>

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
            className="md:hidden absolute top-full left-0 right-0 bg-background border-t border-white/[0.06] px-4 py-4 flex flex-col gap-1"
          >
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm border-l ${
                    isActive ? "border-primary text-text font-medium" : "border-transparent text-muted"
                  }`}
                >
                  <item.icon className={`size-4.5 ${isActive ? "text-primary" : ""}`} />
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
