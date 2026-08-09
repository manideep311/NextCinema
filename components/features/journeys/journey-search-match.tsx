"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Route, ArrowRight } from "lucide-react";
import type { JourneyDef } from "@/types/journey";

const ORDER_LABEL: Record<string, string> = {
  release: "Release order",
  chronological: "Chronological order",
  essential: "Essential order",
};

interface JourneySearchMatchProps {
  journeys: JourneyDef[];
}

/**
 * Shown above normal search results when the query matches a known
 * franchise or one of its movies — search itself is untouched, this is
 * purely additive. No TMDB/poster data needed here (see
 * lib/journeys/definitions.ts#findJourneysByQuery — pure string match),
 * so it can render instantly without waiting on the movie results.
 */
export function JourneySearchMatch({ journeys }: JourneySearchMatchProps) {
  if (journeys.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="mb-6 space-y-2"
    >
      <p className="text-[11px] uppercase tracking-[0.15em] text-primary flex items-center gap-1.5">
        <Route className="size-3.5" /> Movie Journey{journeys.length > 1 ? "s" : ""}
      </p>
      {journeys.map((journey) => (
        <Link
          key={journey.id}
          href={`/dashboard/journeys/${journey.id}`}
          className="flex items-center justify-between gap-4 glass rounded-lg px-4 py-3 hover:border-white/20 transition-colors"
        >
          <div className="min-w-0">
            <h3 className="font-serif text-base truncate">{journey.name}</h3>
            <p className="text-xs text-muted mt-0.5">
              {journey.movies.length} movies · {ORDER_LABEL[journey.availableOrders[0]]}
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-sm text-primary shrink-0">
            View Journey <ArrowRight className="size-3.5" />
          </span>
        </Link>
      ))}
    </motion.div>
  );
}
