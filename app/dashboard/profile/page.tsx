import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Heart, Bookmark, Clock, Mail, Shield } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { listFavorites } from "@/services/favorites";
import { listWatchlist } from "@/services/watchlist";
import { listWatchHistory } from "@/services/watch-history";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Profile — NextCinema" };

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

const STAT_CARDS = [
  { key: "favorites", label: "Favorites", icon: Heart },
  { key: "watchlist", label: "Watchlist", icon: Bookmark },
  { key: "history", label: "Recently Viewed", icon: Clock },
] as const;

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect("/login?redirect=/dashboard/profile");

  const [favorites, watchlist, history] = await Promise.all([
    listFavorites(session.userId),
    listWatchlist(session.userId),
    listWatchHistory(session.userId),
  ]);

  const counts = { favorites: favorites.length, watchlist: watchlist.length, history: history.length };

  return (
    <div className="max-w-3xl">
      <h1 className="font-heading text-2xl font-bold mb-8">Profile</h1>

      <div className="glass rounded-2xl p-6 flex items-center gap-5 mb-8">
        <Avatar size="lg" className="size-16">
          <AvatarFallback className="bg-primary/20 text-primary text-lg">
            {initials(session.name)}
          </AvatarFallback>
        </Avatar>
        <div>
          <h2 className="font-heading text-xl font-semibold">{session.name}</h2>
          <p className="text-muted text-sm flex items-center gap-1.5">
            <Mail className="size-3.5" /> {session.email}
          </p>
          <Badge variant="secondary" className="mt-2 capitalize glass border-white/10">
            <Shield className="size-3" /> {session.role}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {STAT_CARDS.map((stat) => (
          <div key={stat.key} className="glass rounded-xl p-5 text-center">
            <stat.icon className="size-5 text-accent mx-auto mb-2" />
            <p className="font-heading text-2xl font-bold">{counts[stat.key]}</p>
            <p className="text-muted text-xs">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
