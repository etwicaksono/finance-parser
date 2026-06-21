import { getCategories } from "@/actions/categories";
import { getAccounts } from "@/actions/accounts";
import { getAllMappings } from "@/actions/mappings";
import { getContraKeywords } from "@/actions/contra-keywords";
import { getKeywordCleaningRules } from "@/actions/keyword-cleaning-rules";
import { HomeClient } from "@/components/workspace/home-client";
import { CategoryOption, AccountOption } from "@/types";
import { KeywordMapping } from "@/features/suggestions/types";
import { getAiSettings } from "@/actions/ai-settings";

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [categoriesRes, accountsRes, mappingsRes, defaultAiSettings, contraKeywordsRes, cleaningRulesRes] = await Promise.all([
    getCategories(),
    getAccounts(),
    getAllMappings(),
    getAiSettings(),
    getContraKeywords(),
    getKeywordCleaningRules(),
  ]);

  const categories: CategoryOption[] = (categoriesRes.data || []).map((cat: { id: string; name: string }) => ({
    id: cat.id,
    name: cat.name,
  }));

  const accounts: AccountOption[] = (accountsRes.data || []).map((acc: { id: string; name: string }) => ({
    id: acc.id,
    name: acc.name,
  }));

  const mappings: KeywordMapping[] = (mappingsRes.data || []).map((m: { keyword: string; categoryId: string | null; usageCount?: number }) => ({
    keyword: m.keyword,
    categoryId: m.categoryId,
    usageCount: m.usageCount || 0,
  }));

  const geminiModels = process.env.GEMINI_MODELS?.split(",") || ["gemini-2.5-flash"];
  const swiftrouterModels = process.env.SWIFTROUTER_MODELS?.split(",") || ["google/gemini-2.5-flash"];

  const contraKeywords = (contraKeywordsRes.data || []).map((k: { keyword: string }) => k.keyword);

  const cleaningRules = cleaningRulesRes.data ?? { quantityUnits: [], discountPrefixes: [] };

  return (
    <HomeClient
      initialCategories={categories}
      initialAccounts={accounts}
      initialMappings={mappings}
      initialContraKeywords={contraKeywords}
      initialCleaningRules={cleaningRules}
      defaultAiSettings={defaultAiSettings}
      geminiModels={geminiModels}
      swiftrouterModels={swiftrouterModels}
    />
  );
}
