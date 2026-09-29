"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import type { JourneyCardPreview } from "@/services/journeys";
import { JourneyProgress } from "@/components/features/journeys/journey-progress";

interface JourneyCardProps {
  journey: JourneyCardPreview;
}

const IMAGE_BASE_URL = process.env.NEXT_PUBLIC_TMDB_IMAGE_BASE_URL;

/**
 * A journey's discovery-grid card — a small overlapping poster collage of
 * the journey's best-ranked films (the app has no separate key-art asset),
 * its type, title, movie count, and progress only when the viewer actually
 * has some (never a fabricated "0/23").
 */
export function JourneyCard({ journey }: JourneyCardProps) {
  const posters = journey.posterPaths.filter((p): p is string => p !== null).slice(0, 4);

  return (
    <Link href={`/dashboard/journeys/${journey.id}`} className="block group/journey">
      <motion.div
        whileHover={{ y: -3 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="rounded-lg overflow-hidden bg-surface ring-1 ring-white/[0.06] transition-shadow duration-200 group-hover/journey:shadow-lg group-hover/journey:shadow-black/30"
      >
        <div className="relative aspect-[16/9] bg-surface-2 overflow-hidden">
          {posters.length > 0 ? (
            <div className="absolute inset-0 flex items-center justify-center py-4">
              {posters.map((poster, i) => (
                <div
                  key={poster + i}
                  style={{
                    marginLeft: i === 0 ? 0 : "-2.25rem",
                    zIndex: i,
                    rotate: `${(i - (posters.length - 1) / 2) * 4}deg`,
                  }}
                  className="relative w-16 sm:w-20 aspect-[2/3] rounded-md overflow-hidden ring-1 ring-white/10 shadow-lg shrink-0 transition-transform duration-300 group-hover/journey:translate-y-[-2px]"
                >
                  <Image src={`${IMAGE_BASE_URL}/w342${poster}`} alt="" fill sizes="80px" className="object-cover" />
                </div>
              ))}
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-muted text-xs">
              Artwork unavailable
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        </div>

        <div className="p-4">
          <p className="text-[11px] uppercase tracking-[0.15em] text-primary mb-1">{journey.typeLabel}</p>
          <h3 className="font-serif text-lg leading-snug mb-1 text-balance">{journey.name}</h3>
          <p className="text-xs text-muted mb-3">{journey.totalCount} movies</p>

          {journey.watchedCount !== null && journey.watchedCount > 0 && (
            <JourneyProgress watchedCount={journey.watchedCount} totalCount={journey.totalCount} compact />
          )}
        </div>
      </motion.div>
    </Link>
  );
}
