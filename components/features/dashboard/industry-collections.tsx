"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { isPrimaryIndustryId, DEFAULT_PRIMARY_INDUSTRY, type PrimaryIndustryId } from "@/lib/industries";
import { IndustrySelector } from "@/components/features/dashboard/industry-selector";
import { CollectionRail } from "@/components/features/dashboard/collection-rail";
import { useIndustryCollections } from "@/hooks/use-industry-collections";
import type { IndustryCollections as IndustryCollectionsData } from "@/types/discovery";

interface IndustryCollectionsProps {
  initialIndustry: PrimaryIndustryId;
  initialCollections: IndustryCollectionsData;
}

function industryFromLocation(): PrimaryIndustryId | null {
  if (typeof window === "undefined") return null;
  const value = new URLSearchParams(window.location.search).get("industry");
  return isPrimaryIndustryId(value) ? value : null;
}

/**
 * Owns the selected industry and keeps the URL (`?industry=`) in sync via
 * the History API directly — deliberately *not* `router.push`/`replace`,
 * which would re-render the Server Component page (and re-fetch) on every
 * click. The URL still updates for shareable deep links, refresh, and
 * Back/Forward; it just doesn't drive a server round-trip on its own,
 * matching the same "client owns this, URL just reflects it" approach the
 * app already uses (see CategoryTabs). React state is what drives the
 * actual rendered collections, and it's kept in sync with Back/Forward via
 * the `popstate` listener below.
 */
export function IndustryCollections({ initialIndustry, initialCollections }: IndustryCollectionsProps) {
  const [industry, setIndustry] = useState(initialIndustry);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    function handlePopState() {
      setIndustry(industryFromLocation() ?? DEFAULT_PRIMARY_INDUSTRY);
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const { collections, isLoading, hasError, retry } = useIndustryCollections(industry, {
    industry: initialIndustry,
    collections: initialCollections,
  });

  function handleSelect(next: PrimaryIndustryId) {
    if (next === industry) return;
    window.history.pushState(null, "", `/dashboard?industry=${next}`);
    setIndustry(next);
  }

  return (
    <div>
      <IndustrySelector active={industry} onSelect={handleSelect} />

      <motion.div
        key={industry}
        initial={reducedMotion ? undefined : { opacity: 0, y: 6 }}
        animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="mt-8"
      >
        {hasError ? (
          <div className="flex flex-col items-center text-center gap-3 py-14 border border-dashed border-white/10 rounded-lg">
            <p className="text-muted text-sm">Couldn&apos;t load this industry&apos;s collections right now.</p>
            <button onClick={retry} className="text-sm font-medium text-primary hover:underline">
              Try again
            </button>
          </div>
        ) : (
          <>
            <CollectionRail
              title="Hidden Gems"
              description="Movies you probably haven't discovered yet."
              movies={collections?.hiddenGems}
              isLoading={isLoading}
              onRetry={retry}
            />
            <CollectionRail
              title="Top Rated"
              description="The highest-rated films worth watching."
              movies={collections?.topRated}
              isLoading={isLoading}
              onRetry={retry}
            />
            <CollectionRail
              title="Trending Now"
              description="What's getting attention right now."
              movies={collections?.trending}
              isLoading={isLoading}
              onRetry={retry}
            />
            <CollectionRail
              title="Under the Radar"
              description="Great movies that deserve more attention."
              movies={collections?.underTheRadar}
              isLoading={isLoading}
              onRetry={retry}
            />
            <CollectionRail
              title="New Releases"
              description="Fresh from the cinema."
              movies={collections?.newReleases}
              isLoading={isLoading}
              onRetry={retry}
            />
          </>
        )}
      </motion.div>
    </div>
  );
}
