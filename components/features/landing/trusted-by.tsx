"use client";

import { motion } from "framer-motion";

// Illustrative "as seen in" wordmarks for a portfolio project — not real
// press mentions. Text-based rather than logo images since we don't hold
// rights to any real outlet's mark.
const MENTIONS = ["FilmWeekly", "ScreenTake", "The Reel Report", "Cinephile Digest", "Framewatch", "Popcorn & Prose"];

export function TrustedBy() {
  const looped = [...MENTIONS, ...MENTIONS];

  return (
    <section className="py-12 border-y border-white/5 overflow-hidden">
      <p className="text-center text-xs uppercase tracking-widest text-muted mb-6">
        As imagined in
      </p>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-background to-transparent z-10" />
        <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-background to-transparent z-10" />
        <motion.div
          className="flex gap-16 whitespace-nowrap"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
        >
          {looped.map((name, i) => (
            <span key={`${name}-${i}`} className="font-heading text-xl font-semibold text-muted/50">
              {name}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
