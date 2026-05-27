"use client";

import type { ReactNode } from "react";
import { DumbbellIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuthLayoutProps {
  children: ReactNode;
  className?: string;
  subtitle?: string;
  title?: string;
}

export function AuthLayout({
  children,
  className,
  subtitle = "Acceso para coaches",
  title = "CoraFit",
}: AuthLayoutProps) {
  return (
    <main
      className={cn(
        "flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground",
        className,
      )}
    >
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <DumbbellIcon className="size-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xl font-bold tracking-tight">{title}</p>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        {children}
      </div>
    </main>
  );
}
