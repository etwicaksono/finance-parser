import taxonomyData from "../../data/category-taxonomy.json";

export type CategorySign = "income" | "expense" | "both" | "unknown";

export function getCategorySign(categoryName: string): CategorySign {
  let name = categoryName.trim().toLowerCase();
  
  // Strip suffix like "::73" used as identifier in Google Sheets
  const suffixIndex = name.indexOf("::");
  if (suffixIndex !== -1) {
    name = name.substring(0, suffixIndex).trim();
  }

  // 1. Check Income
  const incomeCategories = taxonomyData.income;
  for (const group of incomeCategories) {
    if (group.name.toLowerCase() === name) return "income";
    if (group.children) {
      for (const child of group.children) {
        if (child.name.toLowerCase() === name) return "income";
      }
    }
  }

  // 2. Check Expense
  const expenseCategories = taxonomyData.expense;
  for (const groupName in expenseCategories) {
    if (groupName.toLowerCase() === name) return "expense";
    const group = (expenseCategories as Record<string, { name?: string; children?: { name: string }[] }>)[groupName];
    if (group?.children) {
      for (const child of group.children) {
        if (child.name.toLowerCase() === name) return "expense";
      }
    }
  }

  // 3. Check Both
  const bothCategories = taxonomyData.both;
  for (const groupName in bothCategories) {
    if (groupName.toLowerCase() === name) return "both";
    const group = (bothCategories as Record<string, { name?: string; children?: { name: string }[] }>)[groupName];
    if (group?.children) {
      for (const child of group.children) {
        if (child.name.toLowerCase() === name) return "both";
      }
    }
  }

  return "unknown";
}
