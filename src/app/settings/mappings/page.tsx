import { getCategories } from "@/actions/categories";
import { getLabels } from "@/actions/labels";
import { SettingsShell } from "@/components/settings/settings-shell";
import { MappingsTable } from "@/components/settings/mappings-table";
import { CategoryOption, LabelOption } from "@/types";

export const dynamic = "force-dynamic";

export default async function MappingsSettingsPage() {
  const [categoriesRes, labelsRes] = await Promise.all([
    getCategories(),
    getLabels(),
  ]);

  const categories: CategoryOption[] = (categoriesRes.data || []).map((cat) => ({
    id: cat.id,
    name: cat.name,
  }));

  const labels: LabelOption[] = (labelsRes.data || []).map((label) => ({
    id: label.id,
    name: label.name,
    ...(label.textColor ? { textColor: label.textColor } : {}),
    ...(label.bgColor ? { bgColor: label.bgColor } : {}),
  }));

  return (
    <SettingsShell active="mappings">
      <div className="h-full flex flex-col">
        <MappingsTable categories={categories} labels={labels} />
      </div>
    </SettingsShell>
  );
}
