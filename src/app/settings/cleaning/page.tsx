import { SettingsShell } from "@/components/settings/settings-shell";
import { KeywordCleaningRulesTab } from "@/components/settings/keyword-cleaning-rules-tab";

export const dynamic = "force-dynamic";

export default function CleaningSettingsPage() {
  return (
    <SettingsShell active="cleaning">
      <KeywordCleaningRulesTab />
    </SettingsShell>
  );
}
