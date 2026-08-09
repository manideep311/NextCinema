"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

/** Shown at the top of the dashboard for signed-out visitors — favorites, watchlist, and personalized recommendations are all account-only, though browsing/search/trending stay open. */
export function GuestBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="border-l-2 border-primary bg-surface/60 rounded-r-lg px-5 py-4 mb-8 flex flex-col sm:flex-row items-center justify-between gap-3"
    >
      <span className="text-sm text-muted">
        You&apos;re browsing as a guest — create a free account to save favorites, build a watchlist, and get personalized picks.
      </span>
      <Link href="/signup" className="shrink-0">
        <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg">
          Sign up free
        </Button>
      </Link>
    </motion.div>
  );
}
