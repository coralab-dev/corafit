"use client";

import { PlusIcon, UserRoundIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmptyState({
  actionLabel,
  description,
  onAction,
  title,
}: {
  actionLabel?: string;
  description: string;
  onAction?: () => void;
  title: string;
}) {
  return (
    <div className="flex min-h-44 flex-col items-center justify-center gap-3 rounded-lg border bg-background p-6 text-center">
      <UserRoundIcon className="text-muted-foreground" />
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {actionLabel && onAction ? (
        <Button variant="outline" onClick={onAction}>
          <PlusIcon data-icon="inline-start" />
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

export function LoadingList() {
  return (
    <div className="flex flex-col gap-2">
      {[0, 1, 2].map((item) => (
        <div key={item} className="rounded-lg border bg-background p-3">
          <div className="h-4 w-2/3 rounded bg-muted" />
          <div className="mt-3 h-3 w-1/2 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}
