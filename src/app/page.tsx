import { getCategories } from "@/actions/categories";
import { getAccounts } from "@/actions/accounts";
import { HomeClient } from "@/components/workspace/home-client";
import { CategoryOption, AccountOption } from "@/types";

export default async function HomePage() {
  const [categoriesRes, accountsRes] = await Promise.all([
    getCategories(),
    getAccounts(),
  ]);
  
  // Transform DB model to UI option
  const categories: CategoryOption[] = (categoriesRes.data || []).map((cat: any) => ({
    id: cat.id,
    name: cat.name,
  }));

  const accounts: AccountOption[] = (accountsRes.data || []).map((acc: any) => ({
    id: acc.id,
    name: acc.name,
  }));

  return <HomeClient initialCategories={categories} initialAccounts={accounts} />;
}
