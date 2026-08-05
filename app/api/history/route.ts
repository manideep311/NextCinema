import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { listWatchHistory, recordWatchHistory } from "@/services/watch-history";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ history: [] });

  const history = await listWatchHistory(session.userId);
  return NextResponse.json({ history });
}

export async function POST(request: Request) {
  const session = await getSession();
  // Guests still get to browse — we just don't persist their view history server-side.
  if (!session) return NextResponse.json({ ok: true, persisted: false });

  const movie = await request.json().catch(() => null);
  if (!movie?.id) return NextResponse.json({ error: "Invalid movie" }, { status: 400 });

  await recordWatchHistory(session.userId, movie);
  return NextResponse.json({ ok: true, persisted: true });
}
