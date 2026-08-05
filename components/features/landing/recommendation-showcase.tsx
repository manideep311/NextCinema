"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const GENRES = ["Sci-Fi", "Drama", "Thriller", "Comedy", "Animation"] as const;
const MOODS = ["Mind-bending", "Cozy", "Heartbreaking", "Feel-good", "Tense"] as const;
const DECADES = ["2020s", "2010s", "2000s", "1990s"] as const;

// Small curated demo catalog — tagged with the chip vocabulary above so
// the landing page can show a convincing, instant "AI match" without a
// live TMDB round-trip for anonymous visitors.
const DEMO_CATALOG = [
  { title: "Arrival", genre: "Sci-Fi", mood: "Mind-bending", decade: "2010s", match: 96, reason: "Shares thoughtful sci-fi themes and a director-driven visual style" },
  { title: "Everything Everywhere All at Once", genre: "Comedy", mood: "Mind-bending", decade: "2020s", match: 94, reason: "Genre-bending structure with high emotional payoff" },
  { title: "Past Lives", genre: "Drama", mood: "Heartbreaking", decade: "2020s", match: 93, reason: "Slow-burn emotional drama with restrained, honest writing" },
  { title: "Parasite", genre: "Thriller", mood: "Tense", decade: "2010s", match: 97, reason: "Genre-crossing tension with sharp social commentary" },
  { title: "Spirited Away", genre: "Animation", mood: "Cozy", decade: "2000s", match: 95, reason: "Warm, imaginative world-building with rewatch value" },
  { title: "La La Land", genre: "Drama", mood: "Feel-good", decade: "2010s", match: 91, reason: "Vibrant tone with a bittersweet emotional arc" },
  { title: "The Matrix", genre: "Sci-Fi", mood: "Tense", decade: "1990s", match: 92, reason: "High-concept sci-fi with genre-defining action" },
  { title: "Amélie", genre: "Comedy", mood: "Cozy", decade: "2000s", match: 90, reason: "Whimsical tone with a gentle, character-driven story" },
];

type Chip = { category: "genre" | "mood" | "decade"; value: string };

function scoreMovie(movie: (typeof DEMO_CATALOG)[number], selected: Chip[]) {
  if (selected.length === 0) return movie.match;
  let bonus = 0;
  for (const chip of selected) {
    if (chip.category === "genre" && movie.genre === chip.value) bonus += 3;
    if (chip.category === "mood" && movie.mood === chip.value) bonus += 3;
    if (chip.category === "decade" && movie.decade === chip.value) bonus += 2;
  }
  return Math.min(99, movie.match - 6 + bonus * 2);
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

/** Interactive genre/mood/decade picker that produces an instant, explained "AI match" — the landing page's hands-on demo of the recommendation engine. */
export function RecommendationShowcase() {
  const [selected, setSelected] = useState<Chip[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [revealKey, setRevealKey] = useState(0);

  function toggleChip(chip: Chip) {
    setIsThinking(true);
    setSelected((current) => {
      const exists = current.some((c) => c.category === chip.category && c.value === chip.value);
      return exists
        ? current.filter((c) => !(c.category === chip.category && c.value === chip.value))
        : [...current.filter((c) => c.category !== chip.category), chip];
    });
    setTimeout(() => {
      setIsThinking(false);
      setRevealKey((k) => k + 1);
    }, 650);
  }

  const results = useMemo(() => {
    return [...DEMO_CATALOG]
      .map((movie) => ({ ...movie, computedScore: scoreMovie(movie, selected) }))
      .sort((a, b) => b.computedScore - a.computedScore)
      .slice(0, 3);
  }, [selected]);

  return (
    <section id="ai-preview" className="max-w-5xl mx-auto px-6 py-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center mb-12"
      >
        <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">
          Tell it what you&apos;re <span className="gradient-text">in the mood for</span>
        </h2>
        <p className="text-muted max-w-xl mx-auto">
          Pick a genre, mood, or decade and watch the match scores update instantly.
        </p>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="glass rounded-2xl p-6 space-y-6"
        >
          <ChipGroup label="Genre" options={GENRES} category="genre" selected={selected} onToggle={toggleChip} />
          <ChipGroup label="Mood" options={MOODS} category="mood" selected={selected} onToggle={toggleChip} />
          <ChipGroup label="Decade" options={DECADES} category="decade" selected={selected} onToggle={toggleChip} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="glass rounded-2xl p-6 min-h-[280px] flex flex-col"
        >
          <div className="flex items-center gap-2 text-sm text-muted mb-4">
            <Sparkles className="size-4 text-accent" />
            {isThinking ? "Matching your taste…" : "Top matches"}
          </div>

          <AnimatePresence mode="wait">
            {isThinking ? (
              <motion.div
                key="thinking"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex items-center justify-center text-muted gap-2"
              >
                <Loader2 className="size-5 animate-spin text-accent" />
                <span className="text-sm">AI is thinking…</span>
              </motion.div>
            ) : (
              <motion.div
                key={revealKey}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {results.map((movie, i) => (
                  <motion.div
                    key={movie.title}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{movie.title}</span>
                      <span className="text-accent text-sm font-semibold">{movie.computedScore}%</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-1.5">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${movie.computedScore}%` }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                      />
                    </div>
                    <p className="text-xs text-muted">{movie.reason}</p>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}
