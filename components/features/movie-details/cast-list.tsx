import Image from "next/image";
import type { TmdbCastMember } from "@/types/tmdb";

interface CastListProps {
  cast: TmdbCastMember[];
}

const IMAGE_BASE_URL = process.env.NEXT_PUBLIC_TMDB_IMAGE_BASE_URL;
const MAX_DISPLAYED = 8;

export function CastList({ cast }: CastListProps) {
  const topCast = [...cast].sort((a, b) => a.order - b.order).slice(0, MAX_DISPLAYED);

  if (topCast.length === 0) return null;

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {topCast.map((member) => (
        <div key={member.id} className="w-24 shrink-0 text-center">
          <div className="w-24 h-24 rounded-full overflow-hidden glass mb-2 mx-auto">
            {member.profile_path ? (
              <Image
                src={`${IMAGE_BASE_URL}/w185${member.profile_path}`}
                alt={member.name}
                width={185}
                height={185}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted text-xs bg-surface">
                No photo
              </div>
            )}
          </div>
          <p className="text-xs font-medium truncate">{member.name}</p>
          <p className="text-xs text-muted truncate">{member.character}</p>
        </div>
      ))}
    </div>
  );
}
