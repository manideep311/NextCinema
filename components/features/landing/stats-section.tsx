"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, animate } from "framer-motion";

const STATS = [
  { label: "Movies analyzed", value: 900000, suffix: "+" },
  { label: "Recommendations generated", value: 4200000, suffix: "+" },
  { label: "Average match score", value: 91, suffix: "%" },
  { label: "Movie lovers", value: 58000, suffix: "+" },
];

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
      <p className="font-heading text-3xl md:text-5xl font-bold gradient-text mb-1">
        {value < 1000 ? Math.round(display) : formatValue(display)}
        {suffix}
      </p>
      <p className="text-muted text-sm">{label}</p>
    </div>
  );
}

export function StatsSection() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-16">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="glass rounded-2xl px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8"
      >
        {STATS.map((stat) => (
          <AnimatedStat key={stat.label} {...stat} />
        ))}
      </motion.div>
    </section>
  );
}
