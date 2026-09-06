import { SettingsShell } from "@/components/settings/settings-shell";
import { AccountsTab } from "@/components/settings/accounts-tab";

export const dynamic = "force-dynamic";

export default function AccountsSettingsPage() {
  return (
    <SettingsShell active="accounts">
      <AccountsTab />
    </SettingsShell>
  );
}
