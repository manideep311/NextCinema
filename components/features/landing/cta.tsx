"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Cta() {
  return (
    <section className="max-w-5xl mx-auto px-6 py-24">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="glass rounded-xl px-8 py-16 text-center relative overflow-hidden"
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10"
          style={{
            background: "radial-gradient(circle at 50% 20%, rgba(198,154,77,0.08), transparent 65%)",
          }}
        />
        <h2 className="font-serif text-3xl md:text-4xl mb-4">
          Ready to find your next favorite movie?
        </h2>
        <p className="text-muted mb-8 max-w-md mx-auto">
          Free to start. No credit card required.
        </p>
        <Link href="/dashboard">
          <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg group">
            Get Started Free
            <ArrowRight className="size-4 ml-1 transition-transform group-hover:translate-x-1" />
          </Button>
        </Link>
      </motion.div>
    </section>
  );
}