import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/features/auth/auth-shell";
import { AuthForm } from "@/components/features/auth/auth-form";
import { getTrendingMovies } from "@/services/tmdb";

export const metadata: Metadata = { title: "Sign In — NextCinema" };

export default async function LoginPage() {
  // Best-effort cinematic backdrop — a plain dark page if TMDB is briefly unavailable, never a broken auth screen.
  const backdropPath = await getTrendingMovies()
    .then((res) => res.results.find((m) => m.backdrop_path)?.backdrop_path ?? null)
    .catch(() => null);

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to pick up where you left off." backdropPath={backdropPath}>
      <Suspense>
        <AuthForm mode="login" />
      </Suspense>
    </AuthShell>
  );
}
