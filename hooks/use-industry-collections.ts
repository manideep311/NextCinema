"use client";

import { useCallback, useEffect, useState } from "react";
import type { PrimaryIndustryId } from "@/lib/industries";
import type { IndustryCollections } from "@/types/discovery";

interface DiscoveryState {
  collections: IndustryCollections | null;
  isLoading: boolean;
  hasError: boolean;
  /** Re-runs the fetch for the current industry — for the page-level
   *  "couldn't load, retry" state (a single failed collection has its own
   *  compact retry in CollectionRail and doesn't need this). */
  retry: () => void;
}

/**
 * Fetches an industry's Overview collections client-side, with real race
 * protection: switching industry again before the previous request
 * resolves both aborts the in-flight fetch (`AbortController`, so the
 * stale request stops costing bandwidth/TMDB quota) and ignores its
 * response if it somehow still resolves (`cancelled` flag) — either one
 * alone is enough, together they cover both "the request can still be
 * cancelled" and "the request already left the browser" cases.
 *
 * `initialData` lets the very first industry (already resolved
 * server-side by the page) skip its redundant client fetch entirely —
 * this hook only ever does real work on subsequent industry changes.
 */
export function useIndustryCollections(
  industry: PrimaryIndustryId,
  initialData?: { industry: PrimaryIndustryId; collections: IndustryCollections }
): DiscoveryState {
  const [state, setState] = useState<Omit<DiscoveryState, "retry">>(() =>
    initialData && initialData.industry === industry
      ? { collections: initialData.collections, isLoading: false, hasError: false }
      : { collections: null, isLoading: true, hasError: false }
  );
  const [retryToken, setRetryToken] = useState(0);
  const retry = useCallback(() => setRetryToken((t) => t + 1), []);

  useEffect(() => {
    if (retryToken === 0 && initialData && initialData.industry === industry) {
      // Already have this industry's data from the server-rendered first
      // paint — nothing to fetch. (Only ever true for the very first
      // render; once the user switches away and back, this hook has its
      // own fetched copy and takes the branch below instead.)
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    // Deferred so the "reset to loading" setState runs from an async
    // continuation rather than synchronously in the effect body.
    queueMicrotask(() => {
      if (!cancelled) setState({ collections: null, isLoading: true, hasError: false });
    });

    fetch(`/api/movies/discovery?industry=${industry}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then((res) => {
        if (!res.ok) throw new Error("Discovery request failed");
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setState({ collections: data.collections, isLoading: false, hasError: false });
      })
      .catch((error) => {
        if (cancelled || (error instanceof DOMException && error.name === "AbortError")) return;
        setState({ collections: null, isLoading: false, hasError: true });
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
    // initialData is only consulted on first mount for this industry —
    // intentionally excluded so switching away and back always refetches
    // fresh rather than being pinned to the first server-rendered payload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [industry, retryToken]);

  return { ...state, retry };
}
