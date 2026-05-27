"use client";

import type { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { MobileNav } from "./mobile-nav";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col lg:ml-56">
        <div className="flex h-14 items-center gap-2 border-b bg-card px-4 lg:hidden">
          <MobileNav />
          <span className="text-sm font-semibold">CoraFit</span>
        </div>
        {children}
      </main>
    </div>
  );
}
