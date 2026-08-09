"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/auth-provider";
import { Logo } from "@/components/ui/logo";

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#ai-preview" },
  { label: "Reviews", href: "#testimonials" },
];

/**
 * Fixed navbar that gains a glass/blur background once the user scrolls
 * past the hero — keeps the hero itself clean and full-bleed while still
 * giving scrolled content a readable, separated nav bar.
 */
export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, isLoading } = useAuth();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${
        isScrolled ? "bg-background/95 border-b border-white/[0.06]" : "bg-transparent"
      }`}
    >
      <nav className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 font-serif font-semibold text-lg tracking-tight">
          <Logo />
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-muted hover:text-text transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden md:block">
          {!isLoading && user ? (
            <Link href="/dashboard">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg">Go to Dashboard</Button>
            </Link>
          ) : (
            <Link href="/login">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg">Sign in</Button>
            </Link>
          )}
        </div>

        <button
          className="md:hidden text-text"
          onClick={() => setIsMobileMenuOpen((open) => !open)}
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </nav>

      {isMobileMenuOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="md:hidden glass mx-4 mb-4 rounded-lg px-6 py-4 flex flex-col gap-4"
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-muted hover:text-text"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {link.label}
            </a>
          ))}
          {!isLoading && user ? (
            <Link href="/dashboard" onClick={() => setIsMobileMenuOpen(false)}>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg w-full">
                Go to Dashboard
              </Button>
            </Link>
          ) : (
            <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg w-full">Sign in</Button>
            </Link>
          )}
        </motion.div>
      )}
    </motion.header>
  );
}
