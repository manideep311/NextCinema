"use client";

import { motion } from "framer-motion";
import { Compass, Filter, MessageSquareText, TrendingUp } from "lucide-react";

const FEATURES = [
  {
    icon: Compass,
    title: "Real Taste Matching",
    description: "Get recommendations based on genres, cast, director, and themes — not just what's popular.",
  },
  {
    icon: MessageSquareText,
    title: "Explained Recommendations",
    description: "Every suggestion comes with a clear reason why it matches what you already love.",
  },
  {
    icon: Filter,
    title: "Mood & Genre Filters",
    description: "Not sure what you're in the mood for? Filter by vibe, genre, or era in seconds.",
  },
  {
    icon: TrendingUp,
    title: "Always Fresh",
    description: "Trending and popular picks update continuously, so there's always something new to find.",
  },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export function FeatureCards() {
  return (
    <section id="features" className="max-w-7xl mx-auto px-6 py-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center mb-16"
      >
        <h2 className="font-serif text-3xl md:text-4xl mb-4">
          Built for actual <span className="gradient-text">movie lovers</span>
        </h2>
        <p className="text-muted max-w-xl mx-auto">
          No generic &quot;top 10&quot; lists. Just recommendations that make sense for you.
        </p>
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {FEATURES.map((feature) => (
          <motion.div
            key={feature.title}
            variants={cardVariants}
            whileHover={{ y: -4 }}
            className="glass rounded-lg p-6 transition-shadow hover:shadow-lg hover:shadow-primary/5"
          >
            <feature.icon className="size-6 text-primary mb-4" strokeWidth={1.5} />
            <h3 className="font-serif text-lg mb-2">{feature.title}</h3>
            <p className="text-muted text-sm">{feature.description}</p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}