"use client";

import { useEffect } from "react";
import { useRecentlyViewed } from "@/hooks/use-recently-viewed";
import type { StoredMovie } from "@/types/storage";

interface RecordViewProps {
  movie: Omit<StoredMovie, "addedAt">;
}

/** Invisible client-side effect component: records a movie as recently
 *  viewed the moment its details page mounts. Split out from the page
 *  itself (a server component) since Local Storage access must happen
 *  client-side. */
export function RecordView({ movie }: RecordViewProps) {
  const { addRecentlyViewed } = useRecentlyViewed();

  useEffect(() => {
    addRecentlyViewed(movie);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movie.id]);

  return null;
}
