import { getCategories } from "@/actions/categories";
import { getAccounts } from "@/actions/accounts";
import { getAllMappings } from "@/actions/mappings";
import { HomeClient } from "@/components/workspace/home-client";
import { CategoryOption, AccountOption } from "@/types";
import { KeywordMapping } from "@/features/suggestions/types";

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [categoriesRes, accountsRes, mappingsRes] = await Promise.all([
    getCategories(),
    getAccounts(),
    getAllMappings(),
  ]);
  
  const categories: CategoryOption[] = (categoriesRes.data || []).map((cat: any) => ({
    id: cat.id,
    name: cat.name,
  }));

  const accounts: AccountOption[] = (accountsRes.data || []).map((acc: any) => ({
    id: acc.id,
    name: acc.name,
  }));

  const mappings: KeywordMapping[] = (mappingsRes.data || []).map((m: any) => ({
    keyword: m.keyword,
    categoryId: m.categoryId,
    usageCount: m.usageCount || 0,
  }));

  return <HomeClient initialCategories={categories} initialAccounts={accounts} initialMappings={mappings} />;
}
