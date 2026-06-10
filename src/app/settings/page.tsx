import { getCategories } from "@/actions/categories";
import { getAccounts } from "@/actions/accounts";
import { SettingsClient } from "@/components/settings/settings-client";
import { CategoryOption, AccountOption } from "@/types";

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const [categoriesRes, accountsRes] = await Promise.all([
    getCategories(),
    getAccounts(),
  ]);
  
  const categories: CategoryOption[] = (categoriesRes.data || []).map((cat: any) => ({
    id: cat.id,
    name: cat.name,
  }));

  const accounts: AccountOption[] = (accountsRes.data || []).map((acc: any) => ({
    id: acc.id,
    name: acc.name,
  }));

  return (
    <SettingsClient 
      categories={categories} 
      accounts={accounts} 
    />
  );
}
