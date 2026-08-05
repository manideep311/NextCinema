"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Search, ArrowRight } from "lucide-react";
import Link from "next/link";

const DEMO_QUERIES = [
  "I want something like Interstellar",
  "Slow emotional dramas with a happy ending",
  "Movies with mind-blowing plot twists",
  "I'm sad — cheer me up",
  "Underrated 90s sci-fi",
];

const TYPE_SPEED_MS = 45;
const PAUSE_AFTER_TYPE_MS = 1400;
const PAUSE_AFTER_DELETE_MS = 300;

/**
 * Self-typing search input on the hero — cycles through example natural-
 * language queries so visitors immediately understand what the AI search
 * can do, without needing to type anything themselves. Links to the real
 * (guest-accessible) search page — no account required.
 */
export function AiSearchDemo() {
  const [queryIndex, setQueryIndex] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const current = DEMO_QUERIES[queryIndex];

    if (!isDeleting && displayed === current) {
      const t = setTimeout(() => setIsDeleting(true), PAUSE_AFTER_TYPE_MS);
      return () => clearTimeout(t);
    }

    if (isDeleting && displayed === "") {
      const t = setTimeout(() => {
        setIsDeleting(false);
        setQueryIndex((i) => (i + 1) % DEMO_QUERIES.length);
      }, PAUSE_AFTER_DELETE_MS);
      return () => clearTimeout(t);
    }

    const t = setTimeout(
      () => setDisplayed(current.slice(0, displayed.length + (isDeleting ? -1 : 1))),
      TYPE_SPEED_MS
    );
    return () => clearTimeout(t);
  }, [displayed, isDeleting, queryIndex]);

  return (
    <Link href="/dashboard" className="block w-full max-w-xl mx-auto">
      <motion.div
        whileHover={{ scale: 1.01 }}
        className="glass rounded-2xl px-5 py-4 flex items-center gap-3 text-left cursor-text shadow-lg shadow-primary/5"
      >
        <Search className="size-5 text-muted shrink-0" />
        <span className="flex-1 text-sm md:text-base truncate">
          {displayed}
          <span className="inline-block w-0.5 h-4 bg-accent ml-0.5 align-middle animate-pulse" />
        </span>
        <span className="hidden sm:flex items-center gap-1 text-xs text-accent shrink-0">
          <Sparkles className="size-3.5" /> AI-powered
        </span>
      </motion.div>
      <AnimatePresence mode="wait">
        <motion.p
          key={queryIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-muted mt-3 flex items-center justify-center gap-1"
        >
          Try natural language — no filters required <ArrowRight className="size-3" />
        </motion.p>
      </AnimatePresence>
    </Link>
  );
}
