import { getCategories } from "@/actions/categories";
import { HomeClient } from "@/components/workspace/home-client";
import { CategoryOption } from "@/types";

export default async function HomePage() {
  const { data } = await getCategories();
  
  // Transform DB model to UI option
  const categories: CategoryOption[] = (data || []).map((cat: any) => ({
    id: cat.id,
    name: cat.name,
  }));

  return <HomeClient initialCategories={categories} />;
}
