import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/features/auth/auth-shell";
import { AuthForm } from "@/components/features/auth/auth-form";

export const metadata: Metadata = { title: "Sign Up — NextCinema" };

export default function SignupPage() {
  return (
    <AuthShell title="Create your account" subtitle="Free forever. No credit card required.">
      <Suspense>
        <AuthForm mode="signup" />
      </Suspense>
    </AuthShell>
  );
}
