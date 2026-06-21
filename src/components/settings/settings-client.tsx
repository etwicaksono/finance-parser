"use client";

import * as React from "react";
import { Settings2, Tag, Wallet, BookA, ArrowLeft, Key, Sparkles } from "lucide-react";
import { CategoriesTab } from "./categories-tab";
import { AccountsTab } from "./accounts-tab";
import { MappingsTable } from "./mappings-table";
import { ContraKeywordsTab } from "./contra-keywords-tab";
import { KeywordCleaningRulesTab } from "./keyword-cleaning-rules-tab";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CategoryOption, AccountOption } from "@/types";
import { cn } from "@/lib/utils";

interface SettingsClientProps {
  categories: CategoryOption[];
  accounts: AccountOption[];
}

type PanelId = "categories" | "accounts" | "mappings" | "contra" | "cleaning";

const NAV_ITEMS: { id: PanelId; label: string; icon: React.ElementType }[] = [
  { id: "categories", label: "Categories", icon: Tag },
  { id: "accounts", label: "Accounts", icon: Wallet },
  { id: "mappings", label: "Mappings", icon: BookA },
  { id: "contra", label: "Contra", icon: Key },
  { id: "cleaning", label: "Cleaning", icon: Sparkles },
];

export function SettingsClient({ categories, accounts: _accounts }: SettingsClientProps) {
  const [activePanel, setActivePanel] = React.useState<PanelId>("mappings");

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:px-6">
        <Link href="/">
          <Button variant="ghost" size="icon" aria-label="Back to App">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-primary" />
          <span className="font-semibold tracking-tight text-lg">
            System Settings
          </span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <nav className="w-48 shrink-0 border-r bg-card p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activePanel === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActivePanel(item.id)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Content */}
        <div className="flex-1 overflow-hidden p-6">
          <div className="h-full border rounded-md bg-muted/10 overflow-y-auto p-4">
            {activePanel === "categories" && <CategoriesTab />}
            {activePanel === "accounts" && <AccountsTab />}
            {activePanel === "mappings" && (
              <div className="h-full flex flex-col">
                <MappingsTable categories={categories} />
              </div>
            )}
            {activePanel === "contra" && <ContraKeywordsTab />}
            {activePanel === "cleaning" && <KeywordCleaningRulesTab />}
          </div>
        </div>
      </div>
    </div>
  );
}
