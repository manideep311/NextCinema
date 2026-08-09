import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/features/auth/auth-shell";
import { AuthForm } from "@/components/features/auth/auth-form";
import { getTrendingMovies } from "@/services/tmdb";

export const metadata: Metadata = { title: "Sign Up — NextCinema" };

export default async function SignupPage() {
  const backdropPath = await getTrendingMovies()
    .then((res) => res.results.find((m) => m.backdrop_path)?.backdrop_path ?? null)
    .catch(() => null);

  return (
    <AuthShell title="Create your account" subtitle="Free forever. No credit card required." backdropPath={backdropPath}>
      <Suspense>
        <AuthForm mode="signup" />
      </Suspense>
    </AuthShell>
  );
}
