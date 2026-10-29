import type { UserRole } from "@/lib/auth/token";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  /** Always "user" — the only role (lib/auth/token.ts USER_ROLES). */
  role: UserRole;
}
