"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calculator, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Header() {
  const router = useRouter();

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-4 lg:px-6">
      <div className="flex items-center gap-2">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Calculator className="h-4 w-4" />
          </div>
          <span className="font-semibold tracking-tight">
            Smart Financial Inbox
          </span>
        </Link>
      </div>
      
      <div className="flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="icon" 
          aria-label="Settings"
          onClick={() => router.push("/settings")}
        >
          <Settings className="h-5 w-5 text-muted-foreground" />
        </Button>
      </div>
    </header>
  );
}
