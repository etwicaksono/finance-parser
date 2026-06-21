"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logout } from "@/actions/auth";

export function Header() {
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-4 lg:px-6">
      <div className="flex items-center gap-2">
        <Link href="/" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/parsing.png"
            alt="Finance Parser"
            width={32}
            height={32}
            className="h-8 w-8 object-contain"
          />
          <span className="font-semibold tracking-tight">
            Finance Parser
          </span>
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Settings"
          title="Settings"
          onClick={() => router.push("/settings")}
        >
          <Settings className="h-5 w-5 text-muted-foreground" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Logout"
          title="Logout"
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5 text-muted-foreground" />
        </Button>
      </div>
    </header>
  );
}
