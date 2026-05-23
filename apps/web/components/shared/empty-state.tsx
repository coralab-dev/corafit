"use client";

import type { LucideIcon } from "lucide-react";
import { UserRoundIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  title,
  description,
  icon: Icon = UserRoundIcon,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex min-h-44 flex-col items-center justify-center gap-3 rounded-lg border bg-background p-6 text-center">
      <Icon className="size-8 text-muted-foreground" />
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {actionLabel && onAction ? (
        <Button variant="outline" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
