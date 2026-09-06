"use client";

import * as React from "react";
import Link from "next/link";
import {
  Settings2,
  Tag,
  Tags,
  Wallet,
  BookA,
  ArrowLeft,
  Key,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type SettingsPanelId =
  | "categories"
  | "accounts"
  | "labels"
  | "mappings"
  | "contra"
  | "cleaning";

export const SETTINGS_NAV_ITEMS: {
  id: SettingsPanelId;
  label: string;
  icon: React.ElementType;
}[] = [
  { id: "categories", label: "Categories", icon: Tag },
  { id: "accounts", label: "Accounts", icon: Wallet },
  { id: "labels", label: "Labels", icon: Tags },
  { id: "mappings", label: "Mappings", icon: BookA },
  { id: "contra", label: "Contra", icon: Key },
  { id: "cleaning", label: "Cleaning", icon: Sparkles },
];

/**
 * Shared chrome for the per-panel settings routes. Each route renders the same
 * header + sidebar; the sidebar items are real links so every panel has its
 * own URL (/settings/categories, /settings/labels, ...).
 */
export function SettingsShell({
  active,
  children,
}: {
  active: SettingsPanelId;
  children: React.ReactNode;
}) {
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
        <nav className="w-48 shrink-0 border-r bg-card p-3 space-y-1" aria-label="Settings sections">
          {SETTINGS_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.id;
            return (
              <Link
                key={item.id}
                href={`/settings/${item.id}`}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Content */}
        <div className="flex-1 overflow-hidden p-6">
          <div className="h-full border rounded-md bg-muted/10 overflow-y-auto p-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
