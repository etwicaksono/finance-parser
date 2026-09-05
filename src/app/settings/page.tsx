import { getCategories } from "@/actions/categories";
import { getAccounts } from "@/actions/accounts";
import { getLabels } from "@/actions/labels";
import { SettingsClient } from "@/components/settings/settings-client";
import { CategoryOption, AccountOption, LabelOption } from "@/types";

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const [categoriesRes, accountsRes, labelsRes] = await Promise.all([
    getCategories(),
    getAccounts(),
    getLabels(),
  ]);
  
  const categories: CategoryOption[] = (categoriesRes.data || []).map((cat: { id: string; name: string }) => ({
    id: cat.id,
    name: cat.name,
  }));

  const accounts: AccountOption[] = (accountsRes.data || []).map((acc: { id: string; name: string }) => ({
    id: acc.id,
    name: acc.name,
  }));

  const labels: LabelOption[] = (labelsRes.data || []).map((label: { id: string; name: string }) => ({
    id: label.id,
    name: label.name,
  }));

  return (
    <SettingsClient 
      categories={categories} 
      accounts={accounts} 
      labels={labels} 
    />
  );
}
