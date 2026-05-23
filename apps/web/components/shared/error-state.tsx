"use client";

import { AlertTriangleIcon, RefreshCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "Error",
  message,
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex min-h-44 flex-col items-center justify-center gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-center">
      <AlertTriangleIcon className="size-8 text-destructive" />
      <div>
        <p className="font-semibold text-destructive">{title}</p>
        <p className="mt-1 text-sm text-destructive/80">{message}</p>
      </div>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCwIcon className="mr-2 size-4" />
          Reintentar
        </Button>
      ) : null}
    </div>
  );
}
