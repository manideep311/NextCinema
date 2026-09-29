import type { Metadata } from "next";
import { Heart, Bookmark, Clock, Mail, Shield } from "lucide-react";
import { requirePageSession } from "@/lib/auth/session";
import { countFavorites } from "@/services/favorites";
import { countWatchlist } from "@/services/watchlist";
import { countWatchHistory } from "@/services/watch-history";
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
  // Identity comes from the verified session only — this page can only ever show its own user.
  const session = await requirePageSession("/dashboard/profile");

  // Index-backed counts — no need to fetch every document just to count them.
  const [favorites, watchlist, history] = await Promise.all([
    countFavorites(session.userId),
    countWatchlist(session.userId),
    countWatchHistory(session.userId),
  ]);
  const counts = { favorites, watchlist, history };

  return (
    <div className="max-w-3xl">
      <h1 className="font-serif text-2xl mb-8">Profile</h1>

      <div className="glass rounded-xl p-6 flex items-center gap-5 mb-8">
        <Avatar size="lg" className="size-16">
          <AvatarFallback className="bg-primary/15 text-primary text-lg">
            {initials(session.name)}
          </AvatarFallback>
        </Avatar>
        <div>
          <h2 className="font-serif text-xl">{session.name}</h2>
          <p className="text-muted text-sm flex items-center gap-1.5">
            <Mail className="size-3.5" /> {session.email}
          </p>
          <Badge variant="secondary" className="mt-2 capitalize border border-white/10">
            <Shield className="size-3" /> {session.role}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {STAT_CARDS.map((stat) => (
          <div key={stat.key} className="glass rounded-lg p-5 text-center">
            <stat.icon className="size-5 text-primary mx-auto mb-2" strokeWidth={1.5} />
            <p className="font-serif text-2xl">{counts[stat.key]}</p>
            <p className="text-muted text-xs">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
