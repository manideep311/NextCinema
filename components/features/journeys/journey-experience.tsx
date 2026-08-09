"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import type { JourneyDetail } from "@/services/journeys";
import { JourneyHero } from "@/components/features/journeys/journey-hero";
import { JourneyOrderSelector, ORDER_LABELS } from "@/components/features/journeys/journey-order-selector";
import { JourneyBeforeNowNext } from "@/components/features/journeys/journey-before-now-next";
import { JourneyTrack } from "@/components/features/journeys/journey-track";
import { JourneyMovieInspector } from "@/components/features/journeys/journey-movie-inspector";
import type { ResolvedJourneyMovie } from "@/types/journey";

interface JourneyExperienceProps {
  journeyId: string;
  journeyName: string;
  detail: JourneyDetail;
}

interface InspectorState {
  movie: ResolvedJourneyMovie;
  index: number;
}

const ADVANCE_STORAGE_PREFIX = "cinematch:journey-progress:";
const ADVANCE_BANNER_MS = 3200;

/**
 * Client orchestrator for the interactive journey experience — owns the
 * one piece of shared state everything below reacts to (which movie is
 * open in the inspector) and the "welcome back, you've moved forward"
 * detection. All journey data/resolution stays server-side (see
 * app/dashboard/journeys/[id]/page.tsx); this component only presents it.
 */
export function JourneyExperience({ journeyId, journeyName, detail }: JourneyExperienceProps) {
  const [inspector, setInspector] = useState<InspectorState | null>(null);
  const [justAdvanced, setJustAdvanced] = useState(false);

  useEffect(() => {
    const key = `${ADVANCE_STORAGE_PREFIX}${journeyId}`;
    let cancelled = false;
    let bannerTimeout: ReturnType<typeof setTimeout> | null = null;

    // Deferred to a microtask so the sessionStorage read and any resulting
    // setState happen from an async continuation rather than synchronously
    // in the effect body.
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        const stored = sessionStorage.getItem(key);
        const lastSeen = stored ? Number(stored) : null;
        if (lastSeen !== null && detail.progress.watchedCount > lastSeen) {
          setJustAdvanced(true);
          bannerTimeout = setTimeout(() => setJustAdvanced(false), ADVANCE_BANNER_MS);
        }
        sessionStorage.setItem(key, String(detail.progress.watchedCount));
      } catch {
        // Private browsing / storage disabled — the journey still works,
        // it just never shows the "you've moved forward" banner.
      }
    });

    return () => {
      cancelled = true;
      if (bannerTimeout) clearTimeout(bannerTimeout);
    };
  }, [journeyId, detail.progress.watchedCount]);

  function handleSelect(movie: ResolvedJourneyMovie, index: number) {
    setInspector({ movie, index });
  }

  const orderLabel = ORDER_LABELS[detail.selectedOrder].label;

  return (
    <div>
      <AnimatePresence>
        {justAdvanced && (
          <motion.div
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-5 overflow-hidden"
          >
            <div className="inline-flex items-center gap-2 text-xs text-primary bg-primary/10 rounded-full px-3 py-1.5">
              <Sparkles className="size-3.5" /> Your journey moved forward.
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <JourneyHero journeyName={journeyName} progress={detail.progress} />

      <div className="mt-10 mb-6 glass rounded-xl px-5 py-4">
        <JourneyBeforeNowNext movies={detail.timeline} onSelect={handleSelect} />
      </div>

      <JourneyOrderSelector journeyId={journeyId} orders={detail.availableOrders} selected={detail.selectedOrder} />

      <JourneyTrack movies={detail.timeline} onSelect={handleSelect} />

      <JourneyMovieInspector
        movie={inspector?.movie ?? null}
        position={(inspector?.index ?? 0) + 1}
        totalInOrder={detail.timeline.length}
        orderLabel={orderLabel}
        isNextMovie={inspector?.movie.state === "next"}
        onClose={() => setInspector(null)}
      />
    </div>
  );
}
