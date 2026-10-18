"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { GENRE_NAMES } from "@/lib/tmdb-genres";

export interface ShowcasePick {
  id: number;
  title: string;
  releaseYear: string | null;
  genreIds: number[];
  /** The engine's real 0–100 score for this pick against the seed. */
  matchScore: number;
  /** The engine's top reason for this pick. */
  reason: string | null;
}

interface RecommendationShowcaseProps {
  seed: { title: string; year: string | null } | null;
  picks: ShowcasePick[];
}

type Chip = { category: "genre" | "decade"; value: string };

function decadeOf(year: string | null): string | null {
  return year ? `${year.slice(0, 3)}0s` : null;
}

function ChipGroup({
  label,
  options,
  category,
  selected,
  onToggle,
}: {
  label: string;
  options: readonly string[];
  category: Chip["category"];
  selected: Chip[];
  onToggle: (chip: Chip) => void;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((value) => {
          const isActive = selected.some((c) => c.category === category && c.value === value);
          return (
            <button
              key={value}
              onClick={() => onToggle({ category, value })}
              className={cn(
                "text-sm px-3 py-1.5 rounded-full border transition-colors",
                isActive
                  ? "bg-primary/20 border-primary/50 text-text"
                  : "bg-white/5 border-white/10 text-muted hover:text-text hover:border-white/20"
              )}
            >
              {value}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * The landing page's hands-on example of the recommendation engine. Every
 * score and reason shown here is the engine's real output for one fixed
 * seed movie (computed server-side in live-showcase.tsx and cached) — nothing is
 * hand-written. The genre and decade filters only narrow that real list;
 * their options come from the picks themselves.
 */
export function RecommendationShowcase({ seed, picks }: RecommendationShowcaseProps) {
  const [selected, setSelected] = useState<Chip[]>([]);

  const genreOptions = useMemo(() => {
    const counts = new Map<number, number>();
    for (const pick of picks) for (const id of pick.genreIds) counts.set(id, (counts.get(id) ?? 0) + 1);
    return [...counts.entries()]
      .filter(([id]) => GENRE_NAMES[id])
      .sort((a, b) => b[1] - a[1] || a[0] - b[0])
      .slice(0, 5)
      .map(([id]) => GENRE_NAMES[id]);
  }, [picks]);

  // The four decades most picks come from, newest first.
  const decadeOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const pick of picks) {
      const decade = decadeOf(pick.releaseYear);
      if (decade) counts.set(decade, (counts.get(decade) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || b[0].localeCompare(a[0]))
      .slice(0, 4)
      .map(([decade]) => decade)
      .sort((a, b) => b.localeCompare(a));
  }, [picks]);

  function toggleChip(chip: Chip) {
    setSelected((current) => {
      const exists = current.some((c) => c.category === chip.category && c.value === chip.value);
      return exists
        ? current.filter((c) => !(c.category === chip.category && c.value === chip.value))
        : [...current.filter((c) => c.category !== chip.category), chip];
    });
  }

  const results = useMemo(() => {
    const genre = selected.find((c) => c.category === "genre")?.value;
    const decade = selected.find((c) => c.category === "decade")?.value;
    return picks
      .filter((pick) => !genre || pick.genreIds.some((id) => GENRE_NAMES[id] === genre))
      .filter((pick) => !decade || decadeOf(pick.releaseYear) === decade)
      .slice(0, 3);
  }, [picks, selected]);

  const filterKey = selected.map((c) => `${c.category}:${c.value}`).join("|") || "all";

  return (
    <section id="live-example" className="max-w-5xl mx-auto px-6 py-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center mb-12"
      >
        <h2 className="font-serif text-3xl md:text-4xl mb-4">
          Every pick comes with <span className="gradient-text">a reason</span>
        </h2>
        <p className="text-muted max-w-xl mx-auto">
          {seed
            ? `Live output from the recommendation engine for ${seed.title}${seed.year ? ` (${seed.year})` : ""}. Filter by genre or decade — the scores and reasons are computed, not written by hand.`
            : "Live output from the recommendation engine."}
        </p>
      </motion.div>

      {picks.length === 0 ? (
        <div className="glass rounded-2xl p-6 text-center text-sm text-muted">
          The live example couldn&apos;t load right now.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="glass rounded-2xl p-6 space-y-6"
          >
            <ChipGroup label="Genre" options={genreOptions} category="genre" selected={selected} onToggle={toggleChip} />
            <ChipGroup label="Decade" options={decadeOptions} category="decade" selected={selected} onToggle={toggleChip} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="glass rounded-2xl p-6 min-h-[280px] flex flex-col"
          >
            <div className="flex items-center gap-2 text-sm text-muted mb-4">Top matches</div>

            <AnimatePresence mode="wait">
              <motion.div
                key={filterKey}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {results.length === 0 ? (
                  <p className="text-sm text-muted">No picks match both filters — try another combination.</p>
                ) : (
                  results.map((pick, i) => (
                    <motion.div
                      key={pick.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08 }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">
                          {pick.title}
                          {pick.releaseYear && <span className="text-muted font-normal"> ({pick.releaseYear})</span>}
                        </span>
                        <span className="text-accent text-sm font-semibold">{pick.matchScore}%</span>
                      </div>
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-1.5">
                        <motion.div
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: pick.matchScore / 100 }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                          style={{ transformOrigin: "left" }}
                          className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                        />
                      </div>
                      {pick.reason && <p className="text-xs text-muted">{pick.reason}</p>}
                    </motion.div>
                  ))
                )}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </section>
  );
}
