import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { addToWatchlist, listWatchlist, removeFromWatchlist } from "@/services/watchlist";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ watchlist: [] });

  const watchlist = await listWatchlist(session.userId);
  return NextResponse.json({ watchlist });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in to save your watchlist." }, { status: 401 });

  const movie = await request.json().catch(() => null);
  if (!movie?.id) return NextResponse.json({ error: "Invalid movie" }, { status: 400 });

  await addToWatchlist(session.userId, movie);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in to manage your watchlist." }, { status: 401 });

  const { movieId } = await request.json().catch(() => ({ movieId: null }));
  if (!movieId) return NextResponse.json({ error: "Invalid movie id" }, { status: 400 });

  await removeFromWatchlist(session.userId, movieId);
  return NextResponse.json({ ok: true });
}
