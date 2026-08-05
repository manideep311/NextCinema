import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/features/auth/auth-shell";
import { AuthForm } from "@/components/features/auth/auth-form";

export const metadata: Metadata = { title: "Sign In — NextCinema" };

export default function LoginPage() {
  return (
    <AuthShell title="Welcome back" subtitle="Sign in to pick up where you left off.">
      <Suspense>
        <AuthForm mode="login" />
      </Suspense>
    </AuthShell>
  );
}
