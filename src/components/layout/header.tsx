import { Calculator } from "lucide-react";

export function Header() {
  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-4 lg:px-6">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Calculator className="h-4 w-4" />
        </div>
        <span className="font-semibold tracking-tight">
          Smart Financial Inbox
        </span>
      </div>
      
      {/* Additional header actions (e.g., Theme Toggle, User Profile) can go here later */}
      <div className="flex items-center gap-4">
      </div>
    </header>
  );
}
