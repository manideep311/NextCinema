"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Logo } from "@/components/ui/logo";

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

/** Shared cinematic backdrop + glass card for /login and /signup. */
export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <div className="relative min-h-screen flex items-center justify-center px-6 overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(circle at 20% 20%, rgba(124,58,237,0.25), transparent 55%), radial-gradient(circle at 80% 80%, rgba(6,182,212,0.18), transparent 50%)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md glass rounded-2xl p-8"
      >
        <Link href="/" className="flex items-center gap-2 font-heading font-bold text-lg mb-8 justify-center">
          <Logo />
        </Link>

        <h1 className="font-heading text-2xl font-bold text-center mb-1">{title}</h1>
        <p className="text-muted text-sm text-center mb-8">{subtitle}</p>

        {children}
      </motion.div>
    </div>
  );
}
