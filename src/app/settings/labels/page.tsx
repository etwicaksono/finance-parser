import { SettingsShell } from "@/components/settings/settings-shell";
import { LabelsTab } from "@/components/settings/labels-tab";

export const dynamic = "force-dynamic";

export default function LabelsSettingsPage() {
  return (
    <SettingsShell active="labels">
      <LabelsTab />
    </SettingsShell>
  );
}
