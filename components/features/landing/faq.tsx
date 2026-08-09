"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

const FAQS = [
  {
    question: "How is this different from Netflix's recommendations?",
    answer:
      "We show our work. Every recommendation comes with a plain-English reason — shared genres, cast, director, or themes — instead of a black-box \"because you watched\" label.",
  },
  {
    question: "Do I need an account to use it?",
    answer:
      "No — you can browse trending and popular movies as a guest. Creating a free account lets favorites, watchlist, and viewing history sync across devices.",
  },
  {
    question: "Where does the movie data come from?",
    answer: "NextCinema is built on The Movie Database (TMDB), re-ranked and explained by our own recommendation engine.",
  },
  {
    question: "Is NextCinema free to use?",
    answer: "Yes — browsing, search, and recommendations are all free, no credit card required.",
  },
  {
    question: "What can the assistant do?",
    answer:
      "It recommends movies, explains why a pick fits your taste, and surfaces trending titles — powered by the same recommendation engine as the rest of the site, available once you sign in.",
  },
];

function FaqItem({ question, answer, isOpen, onToggle }: { question: string; answer: string; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="glass rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
        aria-expanded={isOpen}
      >
        <span className="font-medium text-sm md:text-base">{question}</span>
        <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="size-4 text-muted shrink-0" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <p className="px-5 pb-4 text-muted text-sm leading-relaxed">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="max-w-3xl mx-auto px-6 py-24">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="font-serif text-3xl md:text-4xl text-center mb-12"
      >
        Frequently asked <span className="gradient-text">questions</span>
      </motion.h2>

      <div className="space-y-3">
        {FAQS.map((faq, i) => (
          <FaqItem
            key={faq.question}
            {...faq}
            isOpen={openIndex === i}
            onToggle={() => setOpenIndex((current) => (current === i ? null : i))}
          />
        ))}
      </div>
    </section>
  );
}
