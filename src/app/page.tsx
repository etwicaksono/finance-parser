import { AppShell } from "@/components/layout/app-shell";
import { MainWorkspace } from "@/components/layout/main-workspace";

export default function HomePage() {
  return (
    <AppShell>
      <MainWorkspace
        inputPanel={
          <div className="flex h-full items-center justify-center p-4 text-center text-sm text-muted-foreground">
            {/* Placeholder for TASK-007 (WhatsApp Input Panel) */}
            <p>Input Panel (WhatsApp Chat Paste Area) will be built in TASK-007</p>
          </div>
        }
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
