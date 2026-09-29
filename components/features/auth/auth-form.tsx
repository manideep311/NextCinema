"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, Mail, Lock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/auth-provider";
import { sanitizeRedirect } from "@/lib/auth/redirect";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/lib/auth/password-policy";

interface AuthFormProps {
  mode: "login" | "signup";
}

const inputClass =
  "w-full glass rounded-lg pl-10 pr-4 py-2.5 text-sm outline-none placeholder:text-muted focus:ring-1 focus:ring-primary/60 transition-shadow";

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refresh } = useAuth();
  // Sent here from a guest action (e.g. "add to watchlist") — after auth, return them right where they
  // were. Sanitized to same-site paths only, so a crafted link can't bounce users off-site after login.
  const rawRedirect = searchParams.get("redirect");
  const redirectTo = sanitizeRedirect(rawRedirect);
  const carriedRedirect = rawRedirect ? `?redirect=${encodeURIComponent(redirectTo)}` : "";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/auth/${mode === "login" ? "login" : "signup"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "login" ? { email, password } : { name, email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }

      await refresh();
      router.push(redirectTo);
      router.refresh();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {mode === "signup" && (
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted" />
          <input
            type="text"
            required
            maxLength={80}
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
        </div>
      )}

      <div className="relative">
        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted" />
        <input
          type="email"
          required
          maxLength={254}
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
      </div>

      <div className="relative">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted" />
        <input
          type="password"
          required
          minLength={mode === "signup" ? PASSWORD_MIN_LENGTH : undefined}
          maxLength={PASSWORD_MAX_LENGTH}
          placeholder={mode === "signup" ? `Password (min. ${PASSWORD_MIN_LENGTH} characters)` : "Password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
        />
      </div>

      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <Button
        type="submit"
        disabled={isSubmitting}
        size="lg"
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg"
      >
        {isSubmitting ? (
          <Loader2 className="size-4 animate-spin" />
        ) : mode === "login" ? (
          "Sign In"
        ) : (
          "Create Account"
        )}
      </Button>

      <p className="text-center text-sm text-muted">
        {mode === "login" ? (
          <>
            Don&apos;t have an account?{" "}
            <Link href={`/signup${carriedRedirect}`} className="text-accent hover:underline">
              Sign up
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link href={`/login${carriedRedirect}`} className="text-accent hover:underline">
              Sign in
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
