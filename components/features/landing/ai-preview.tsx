"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";

/**
 * A static mockup of what a real "why we recommended this" card looks
 * like — gives visitors a concrete preview of the AI explanation feature
 * before they sign up, without needing a live API call on the landing page.
 */
export function AiPreview() {
  return (
    <section id="ai-preview" className="max-w-5xl mx-auto px-6 py-24">
      <div className="grid md:grid-cols-2 gap-12 items-center">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">
            See exactly <span className="gradient-text">why</span> it fits
          </h2>
          <p className="text-muted mb-6">
            Every recommendation shows its reasoning — shared genres, cast,
            director, or themes — so you're never left guessing.
          </p>
          <ul className="space-y-3 text-sm text-muted">
            <li className="flex items-center gap-2">
              <Star className="size-4 text-accent" /> Genre and keyword overlap
            </li>
            <li className="flex items-center gap-2">
              <Star className="size-4 text-accent" /> Shared cast and directors
            </li>
            <li className="flex items-center gap-2">
              <Star className="size-4 text-accent" /> Rating and popularity signals
            </li>
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="glass rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="font-heading font-semibold">Interstellar</span>
            <span className="text-accent font-bold">94% match</span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full mb-4 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: "94%" }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
            />
          </div>
          <p className="text-muted text-sm">
            Shares director (Christopher Nolan) · Similar genres: Sci-Fi, Drama ·
            Similar themes: dream, time
          </p>
        </motion.div>
      </div>
    </section>
  );
}