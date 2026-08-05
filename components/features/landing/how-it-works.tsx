"use client";

import { motion } from "framer-motion";
import { Heart, Cpu, Sparkles } from "lucide-react";

const STEPS = [
  {
    icon: Heart,
    title: "Tell us what you love",
    description: "Favorite a few movies or describe what you're in the mood for — no lengthy quiz required.",
  },
  {
    icon: Cpu,
    title: "The AI finds the pattern",
    description: "We score genres, keywords, cast, and directors against your taste to find real similarity — not just popularity.",
  },
  {
    icon: Sparkles,
    title: "Get matches, with reasons",
    description: "Every recommendation ships with a plain-English reason, so you always know why it's there.",
  },
];

export function HowItWorks() {
  return (
    <section className="max-w-5xl mx-auto px-6 py-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center mb-16"
      >
        <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">
          How <span className="gradient-text">NextCinema</span> works
        </h2>
      </motion.div>

      <div className="relative grid md:grid-cols-3 gap-8">
        <div
          aria-hidden="true"
          className="hidden md:block absolute top-8 left-[16.5%] right-[16.5%] h-px bg-gradient-to-r from-primary/40 via-accent/40 to-primary/40"
        />
        {STEPS.map((step, i) => (
          <motion.div
            key={step.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.15 }}
            className="relative text-center"
          >
            <div className="size-16 rounded-2xl glass flex items-center justify-center mx-auto mb-4 relative z-10">
              <step.icon className="size-7 text-accent" />
            </div>
            <h3 className="font-heading font-semibold mb-2">{step.title}</h3>
            <p className="text-muted text-sm max-w-xs mx-auto">{step.description}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
