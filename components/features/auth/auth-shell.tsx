"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Logo } from "@/components/ui/logo";

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  /** A trending movie's backdrop, fetched server-side by the page — optional and purely decorative, so a missing/failed fetch just falls back to a plain dark background. */
  backdropPath?: string | null;
}

const IMAGE_BASE_URL = process.env.NEXT_PUBLIC_TMDB_IMAGE_BASE_URL;

/** Shared cinematic backdrop + card for /login and /signup. */
export function AuthShell({ title, subtitle, children, backdropPath }: AuthShellProps) {
  return (
    <div className="relative min-h-screen flex items-center justify-center px-6 py-16 overflow-hidden">
      {backdropPath && (
        <div className="absolute inset-0 -z-20">
          <Image
            src={`${IMAGE_BASE_URL}/w1280${backdropPath}`}
            alt=""
            fill
            priority
            className="object-cover opacity-25"
          />
        </div>
      )}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-t from-background via-background/95 to-background/80"
      />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md glass rounded-xl p-8"
      >
        <Link href="/" className="flex items-center gap-2 font-serif font-semibold text-lg mb-8 justify-center tracking-tight">
          <Logo />
        </Link>

        <h1 className="font-serif text-2xl text-center mb-1">{title}</h1>
        <p className="text-muted text-sm text-center mb-8">{subtitle}</p>

        {children}
      </motion.div>
    </div>
  );
}