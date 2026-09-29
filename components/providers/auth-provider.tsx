"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { AuthUser } from "@/types/auth";
import { clearUserScopedStorage } from "@/lib/local-storage";

interface AuthContextValue {
  user: AuthUser | null;
  /** Kept for API compatibility — the server always resolves the session before render, so this is never true. */
  isLoading: boolean;
  /** Re-reads /api/auth/session — call after login/signup so every consumer updates. */
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Wraps the whole app. The root layout verifies the session cookie on the
 * server and passes the result in (`null` = signed out), so there is no
 * client-side session fetch on page load for anyone — signed in or not.
 * The JWT itself stays in an httpOnly cookie and is never visible here.
 */
export function AuthProvider({
  children,
  initialUser,
}: {
  children: React.ReactNode;
  initialUser: AuthUser | null;
}) {
  const [user, setUser] = useState<AuthUser | null>(initialUser);
  const router = useRouter();

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session", { cache: "no-store" });
      const data = await res.json();
      setUser(data.user ?? null);
    } catch {
      setUser(null);
    }
  }, []);

  const logout = useCallback(async () => {
    const signedOutUserId = user?.id;
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    // Per-user browser data (recent searches) shouldn't outlive the session on a shared device.
    if (signedOutUserId) clearUserScopedStorage(signedOutUserId);
    setUser(null);
    // Re-render server components without the session: protected pages redirect, libraries reset.
    router.refresh();
  }, [router, user?.id]);

  return (
    <AuthContext.Provider value={{ user, isLoading: false, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
