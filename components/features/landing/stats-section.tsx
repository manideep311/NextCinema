"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, animate } from "framer-motion";

export interface LandingStat {
  label: string;
  value: number;
  suffix: string;
}

function formatValue(value: number) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${Math.round(value / 1000)}K`;
  return `${Math.round(value)}`;
}

function AnimatedStat({ value, suffix, label }: { value: number; suffix: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    const controls = animate(0, value, {
      duration: 1.6,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [isInView, value]);

  return (
    <div ref={ref} className="text-center">
      <p className="font-serif text-3xl md:text-5xl gradient-text mb-1">
        {value < 1000 ? Math.round(display) : formatValue(display)}
        {suffix}
      </p>
      <p className="text-muted text-sm">{label}</p>
    </div>
  );
}

/**
 * Every number here is derived from the running system (see app/page.tsx):
 * TMDB's live catalog size and the app's own configuration — no invented
 * usage or accuracy figures.
 */
export function StatsSection({ stats }: { stats: LandingStat[] }) {
  return (
    <section className="max-w-6xl mx-auto px-6 py-16">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="glass rounded-lg px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8"
      >
        {stats.map((stat) => (
          <AnimatedStat key={stat.label} {...stat} />
        ))}
      </motion.div>
    </section>
  );
}
