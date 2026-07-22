"use client";

import type { ReactNode } from "react";
import { CoraFitBrand } from "@/components/shared/corafit-brand";
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
        <div className="mb-6 flex flex-col items-center justify-center gap-3">
          <CoraFitBrand alt={title} className="h-9 w-auto" />
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        {children}
      </div>
    </main>
  );
}
