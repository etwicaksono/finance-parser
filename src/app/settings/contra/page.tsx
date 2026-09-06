import { SettingsShell } from "@/components/settings/settings-shell";
import { ContraKeywordsTab } from "@/components/settings/contra-keywords-tab";

export const dynamic = "force-dynamic";

export default function ContraSettingsPage() {
  return (
    <SettingsShell active="contra">
      <ContraKeywordsTab />
    </SettingsShell>
  );
}
