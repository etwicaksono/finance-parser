import { AppShell } from "@/components/layout/app-shell";
import { MainWorkspace } from "@/components/layout/main-workspace";
import { WhatsAppInput } from "@/components/workspace/whatsapp-input";

export default function HomePage() {
  return (
    <AppShell>
      <MainWorkspace
        inputPanel={<WhatsAppInput />}
        spreadsheetPanel={
          <div className="flex h-full items-center justify-center p-4 text-center text-sm text-muted-foreground">
            {/* Placeholder for TASK-014 (Spreadsheet Table) */}
            <p>Spreadsheet Panel will be built in TASK-014</p>
          </div>
        }
      />
    </AppShell>
  );
}
