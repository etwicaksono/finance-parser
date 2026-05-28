"use client";

import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings2, Tag, Wallet, BookA, ArrowLeft } from "lucide-react";
import { CategoriesTab } from "./categories-tab";
import { AccountsTab } from "./accounts-tab";
import { MappingsTable } from "./mappings-table";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CategoryOption, AccountOption } from "@/types";

interface SettingsClientProps {
  categories: CategoryOption[];
  accounts: AccountOption[];
}

export function SettingsClient({ categories, accounts }: SettingsClientProps) {
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

      <main className="flex-1 overflow-hidden p-6 max-w-6xl mx-auto w-full">
        <Tabs defaultValue="mappings" className="h-full flex flex-col">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="categories" className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Categories
            </TabsTrigger>
            <TabsTrigger value="accounts" className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Accounts
            </TabsTrigger>
            <TabsTrigger value="mappings" className="flex items-center gap-2">
              <BookA className="h-4 w-4" />
              Mappings
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden mt-4 border rounded-md bg-muted/10">
            <TabsContent value="categories" className="h-full mt-0 overflow-y-auto p-4">
              <CategoriesTab />
            </TabsContent>

            <TabsContent value="accounts" className="h-full mt-0 overflow-y-auto p-4">
              <AccountsTab />
            </TabsContent>

            <TabsContent value="mappings" className="h-full mt-0 flex flex-col">
              <MappingsTable categories={categories} />
            </TabsContent>
          </div>
        </Tabs>
      </main>
    </div>
  );
}
