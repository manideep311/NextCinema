import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateUser } from "@/services/auth";
import { setSessionCookie } from "@/lib/auth/session";

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  try {
    const user = await authenticateUser(parsed.data.email, parsed.data.password);
    await setSessionCookie({ userId: user.id, email: user.email, name: user.name, role: user.role });
    return NextResponse.json({ user });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not sign in.";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
