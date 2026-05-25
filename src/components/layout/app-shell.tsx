import { Header } from "./header";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background">
      <Header />
      <main className="flex flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
