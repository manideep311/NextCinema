import type { Metadata } from "next";
import { CategoryTabs } from "@/components/features/dashboard/category-tabs";

export const metadata: Metadata = { title: "Categories — NextCinema" };

export default function CategoriesPage() {
  return (
    <div>
      <h1 className="font-serif text-2xl mb-1">Categories</h1>
      <p className="text-muted mb-8">Browse by industry.</p>
      <CategoryTabs />
    </div>
  );
}
