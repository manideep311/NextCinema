"use client";

import { motion } from "framer-motion";
import { Quote } from "lucide-react";

// Fictional/placeholder reviewers — replace with real user testimonials
// once the product has actual users. Flagging clearly here so this
// doesn't accidentally ship to production as real quotes.
const TESTIMONIALS = [
  {
    quote: "Finally a recommendation engine that explains itself instead of just guessing.",
    name: "Aisha R.",
    role: "Film enthusiast",
  },
  {
    quote: "Found three movies in one night that I'd never have discovered otherwise.",
    name: "Marcus T.",
    role: "Weekend binge-watcher",
  },
  {
    quote: "The mood filter alone makes this better than scrolling for 20 minutes undecided.",
    name: "Priya K.",
    role: "Casual viewer",
  },
];

export function Testimonials() {
  return (
    <section id="testimonials" className="max-w-7xl mx-auto px-6 py-24">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="font-serif text-3xl md:text-4xl text-center mb-16"
      >
        Loved by <span className="gradient-text">movie fans</span>
      </motion.h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {TESTIMONIALS.map((t, i) => (
          <motion.div
            key={t.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
            className="glass rounded-lg p-6"
          >
            <Quote className="size-6 text-primary mb-4" />
            <p className="text-text mb-4 text-sm leading-relaxed">&quot;{t.quote}&quot;</p>
            <p className="text-sm font-semibold">{t.name}</p>
            <p className="text-muted text-xs">{t.role}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}