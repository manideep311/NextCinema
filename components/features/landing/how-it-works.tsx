"use client";

import { motion } from "framer-motion";
import { Heart, ListFilter, MessageSquareText } from "lucide-react";

const STEPS = [
  {
    icon: Heart,
    title: "Tell us what you love",
    description: "Favorite a few movies or describe what you're in the mood for — no lengthy quiz required.",
  },
  {
    icon: ListFilter,
    title: "We find the pattern",
    description: "We score genres, keywords, cast, and directors against your taste to find real similarity — not just popularity.",
  },
  {
    icon: MessageSquareText,
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
        <h2 className="font-serif text-3xl md:text-4xl mb-4">
          How <span className="gradient-text">NextCinema</span> works
        </h2>
      </motion.div>

      <div className="relative grid md:grid-cols-3 gap-8">
        <div
          aria-hidden="true"
          className="hidden md:block absolute top-8 left-[16.5%] right-[16.5%] h-px bg-white/10"
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
            <div className="size-14 rounded-full glass flex items-center justify-center mx-auto mb-4 relative z-10">
              <step.icon className="size-5 text-primary" strokeWidth={1.5} />
            </div>
            <h3 className="font-serif text-lg mb-2">{step.title}</h3>
            <p className="text-muted text-sm max-w-xs mx-auto">{step.description}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
