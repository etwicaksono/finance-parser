"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings2, Tag, Wallet, BookA } from "lucide-react";

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] h-[85vh] flex flex-col overflow-hidden p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Settings2 className="h-5 w-5 text-primary" />
            System Settings
          </DialogTitle>
          <DialogDescription>
            Manage your accounts, categories, and keyword mapping rules.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden p-6">
          <Tabs defaultValue="categories" className="h-full flex flex-col">
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

            <div className="flex-1 overflow-y-auto mt-4 border rounded-md p-4 bg-muted/10">
              <TabsContent value="categories" className="h-full mt-0">
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                  <p>Categories management will be implemented here.</p>
                </div>
              </TabsContent>

              <TabsContent value="accounts" className="h-full mt-0">
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                  <p>Accounts management will be implemented here.</p>
                </div>
              </TabsContent>

              <TabsContent value="mappings" className="h-full mt-0">
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                  <p>Keyword mappings and aliases will be implemented here.</p>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
