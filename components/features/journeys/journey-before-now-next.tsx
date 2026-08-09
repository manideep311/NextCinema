"use client";

import { ChevronRight, Check, Circle } from "lucide-react";
import type { ResolvedJourneyMovie } from "@/types/journey";

interface JourneyBeforeNowNextProps {
  movies: ResolvedJourneyMovie[];
  onSelect: (movie: ResolvedJourneyMovie, index: number) => void;
}

/**
 * A compact contextual strip — the three movies immediately around "now,"
 * read as one cinematic sequence (BEFORE → NOW → NEXT) rather than three
 * separate cards. Purely a different lens on the same track data; clicking
 * an entry opens the same inspector the main track does.
 */
export function JourneyBeforeNowNext({ movies, onSelect }: JourneyBeforeNowNextProps) {
  const nowIndex = movies.findIndex((m) => m.state === "next");
  if (nowIndex === -1) return null;

  const before = nowIndex > 0 ? movies[nowIndex - 1] : null;
  const now = movies[nowIndex];
  const next = nowIndex < movies.length - 1 ? movies[nowIndex + 1] : null;

  return (
    <div className="flex items-center flex-wrap gap-x-2 gap-y-3 text-sm">
      {before && (
        <>
          <Segment label="Before" title={before.title} tone="muted" icon={<Check className="size-3" />} onClick={() => onSelect(before, nowIndex - 1)} />
          <ChevronRight className="size-3.5 text-muted/50 shrink-0" />
        </>
      )}

      <Segment label="Now" title={now.title} tone="primary" onClick={() => onSelect(now, nowIndex)} />

      {next && (
        <>
          <ChevronRight className="size-3.5 text-muted/50 shrink-0" />
          <Segment label="Next" title={next.title} tone="muted" icon={<Circle className="size-2" />} onClick={() => onSelect(next, nowIndex + 1)} />
        </>
      )}
    </div>
  );
}

function Segment({
  label,
  title,
  tone,
  icon,
  onClick,
}: {
  label: string;
  title: string;
  tone: "primary" | "muted";
  icon?: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left rounded-md px-1.5 py-0.5 -mx-1.5 hover:bg-white/5 transition-colors"
    >
      <p className={`text-[10px] uppercase tracking-[0.15em] mb-0.5 ${tone === "primary" ? "text-primary" : "text-muted"}`}>
        {label}
      </p>
      <p
        className={`flex items-center gap-1.5 truncate max-w-[160px] ${
          tone === "primary" ? "font-serif text-base text-text" : "text-xs text-muted"
        }`}
      >
        {icon}
        {title}
      </p>
    </button>
  );
}
