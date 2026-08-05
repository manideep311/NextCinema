import Image from "next/image";
import { DollarSign, Building2, Languages, Circle } from "lucide-react";
import type { TmdbProductionCompany, TmdbSpokenLanguage } from "@/types/tmdb";

interface MovieFactsProps {
  budget: number;
  revenue: number;
  status: string;
  productionCompanies: TmdbProductionCompany[];
  spokenLanguages: TmdbSpokenLanguage[];
}

const IMAGE_BASE_URL = process.env.NEXT_PUBLIC_TMDB_IMAGE_BASE_URL;

function formatCurrency(value: number): string {
  if (!value) return "Undisclosed";
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  return `$${value.toLocaleString()}`;
}

export function MovieFacts({ budget, revenue, status, productionCompanies, spokenLanguages }: MovieFactsProps) {
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <div className="glass rounded-xl p-4 flex items-center gap-3">
        <DollarSign className="size-5 text-accent shrink-0" />
        <div>
          <p className="text-xs text-muted">Budget</p>
          <p className="text-sm font-medium">{formatCurrency(budget)}</p>
        </div>
      </div>

      <div className="glass rounded-xl p-4 flex items-center gap-3">
        <DollarSign className="size-5 text-accent shrink-0" />
        <div>
          <p className="text-xs text-muted">Revenue</p>
          <p className="text-sm font-medium">{formatCurrency(revenue)}</p>
        </div>
      </div>

      <div className="glass rounded-xl p-4 flex items-center gap-3">
        <Circle className="size-5 text-accent shrink-0 fill-current" />
        <div>
          <p className="text-xs text-muted">Status</p>
          <p className="text-sm font-medium">{status}</p>
        </div>
      </div>

      <div className="glass rounded-xl p-4 flex items-center gap-3">
        <Languages className="size-5 text-accent shrink-0" />
        <div>
          <p className="text-xs text-muted">Languages</p>
          <p className="text-sm font-medium">
            {spokenLanguages.length > 0
              ? spokenLanguages.map((l) => l.english_name).join(", ")
              : "—"}
          </p>
        </div>
      </div>

      {productionCompanies.length > 0 && (
        <div className="glass rounded-xl p-4 sm:col-span-2">
          <div className="flex items-center gap-2 mb-3 text-xs text-muted">
            <Building2 className="size-4" /> Production
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {productionCompanies.map((company) =>
              company.logo_path ? (
                // Logos come in every color TMDB's contributors uploaded them in — a light
                // chip behind each one keeps them legible without flattening them to white.
                <div key={company.id} className="bg-white/90 rounded-md px-2.5 py-1.5">
                  <Image
                    src={`${IMAGE_BASE_URL}/w200${company.logo_path}`}
                    alt={company.name}
                    width={80}
                    height={30}
                    className="h-5 w-auto object-contain"
                  />
                </div>
              ) : (
                <span key={company.id} className="text-sm text-muted">
                  {company.name}
                </span>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
