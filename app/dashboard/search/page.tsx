import type { Metadata } from "next";
import { SearchView } from "@/components/features/search/search-view";
import { MAX_SEARCH_QUERY_LENGTH } from "@/lib/validation";

export const metadata: Metadata = { title: "Search — NextCinema" };

interface SearchPageProps {
  searchParams: Promise<{ q?: string | string[] }>;
}

/** Reads `?q=` so links (landing-page examples, shared URLs) open with the search already run. */
export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q } = await searchParams;
  const initialQuery = typeof q === "string" ? q.trim().slice(0, MAX_SEARCH_QUERY_LENGTH) : "";
  return <SearchView initialQuery={initialQuery} />;
}
