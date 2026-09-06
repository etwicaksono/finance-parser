import { SettingsShell } from "@/components/settings/settings-shell";
import { CategoriesTab } from "@/components/settings/categories-tab";

export const dynamic = "force-dynamic";

export default function CategoriesSettingsPage() {
  return (
    <SettingsShell active="categories">
      <CategoriesTab />
    </SettingsShell>
  );
}
