"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import Link from "next/link";

const DEMO_QUERIES = [
  "Something like Interstellar",
  "Slow emotional dramas with a happy ending",
  "Movies with mind-blowing plot twists",
  "I'm sad — cheer me up",
  "Underrated 90s sci-fi",
];

const TYPE_SPEED_MS = 45;
const PAUSE_AFTER_TYPE_MS = 1400;
const PAUSE_AFTER_DELETE_MS = 300;

/**
 * Self-typing search field on the hero — cycles through example natural-
 * language queries so visitors immediately understand what the search can
 * do, without needing to type anything themselves. Links to the real
 * (guest-accessible) search page — no account required. Deliberately reads
 * as a premium discovery field, not an AI chatbot: no "AI-powered" badge,
 * no sparkle iconography.
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
    <Link href="/dashboard/search" className="block w-full max-w-md">
      <motion.div
        whileHover={{ borderColor: "var(--color-primary)" }}
        className="glass rounded-lg px-5 py-4 flex items-center gap-3 text-left cursor-text"
      >
        <Search className="size-4 text-muted shrink-0" />
        <span className="flex-1 text-sm md:text-base truncate text-text">
          {displayed || "What are you in the mood for?"}
          {displayed && (
            <span className="inline-block w-0.5 h-4 bg-primary ml-0.5 align-middle animate-pulse" />
          )}
        </span>
      </motion.div>
    </Link>
  );
}