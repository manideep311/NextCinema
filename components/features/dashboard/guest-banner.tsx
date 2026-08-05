"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Shown at the top of the dashboard for signed-out visitors — favorites, watchlist, and personalized recommendations are all account-only, though browsing/search/trending stay open. */
export function GuestBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-xl px-5 py-4 mb-8 flex flex-col sm:flex-row items-center justify-between gap-3"
    >
      <div className="flex items-center gap-3 text-sm">
        <div className="size-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
          <Sparkles className="size-4 text-accent" />
        </div>
        <span className="text-muted">
          You&apos;re browsing as a guest — create a free account to save favorites, build a watchlist, and get personalized picks.
        </span>
      </div>
      <Link href="/signup" className="shrink-0">
        <Button size="sm" className="bg-primary hover:bg-primary/90 rounded-xl">
          Sign up free
        </Button>
      </Link>
    </motion.div>
  );
}
