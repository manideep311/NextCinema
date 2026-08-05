import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { addFavorite, listFavorites, removeFavorite } from "@/services/favorites";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ favorites: [] });

  const favorites = await listFavorites(session.userId);
  return NextResponse.json({ favorites });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in to save favorites." }, { status: 401 });

  const movie = await request.json().catch(() => null);
  if (!movie?.id) return NextResponse.json({ error: "Invalid movie" }, { status: 400 });

  await addFavorite(session.userId, movie);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in to manage favorites." }, { status: 401 });

  const { movieId } = await request.json().catch(() => ({ movieId: null }));
  if (!movieId) return NextResponse.json({ error: "Invalid movie id" }, { status: 400 });

  await removeFavorite(session.userId, movieId);
  return NextResponse.json({ ok: true });
}
