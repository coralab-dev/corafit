"use client";

import type { ReactNode } from "react";
import { cn } from "../../lib/utils";
import { CoraFitBrand } from "./corafit-brand";

interface AuthLayoutProps {
  children: ReactNode;
  brandAlt?: string;
  className?: string;
  subtitle?: string;
}

export function AuthLayout({
  children,
  brandAlt = "CoraFit",
  className,
  subtitle = "Acceso para coaches",
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
          <CoraFitBrand alt={brandAlt} className="h-9 w-auto" />
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        {children}
      </div>
    </main>
  );
}
