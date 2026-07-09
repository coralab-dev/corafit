"use client";

import { PlusIcon, UserRoundIcon } from "lucide-react";
import Link from "next/link";
import { ListRowsSkeleton } from "@/components/shared/skeletons";
import { Button } from "@/components/ui/button";

export function EmptyState({
  actionHref,
  actionLabel,
  description,
  onAction,
  title,
}: {
  actionHref?: string;
  actionLabel?: string;
  description: string;
  onAction?: () => void;
  title: string;
}) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center gap-4 rounded-2xl border !border-transparent bg-card p-8 text-center shadow-[var(--surface-shadow-soft)]">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-accent text-primary">
        <UserRoundIcon className="size-5" />
      </div>
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      </div>
      {actionLabel && actionHref ? (
        <Button asChild variant="outline">
          <Link href={actionHref}>
            <PlusIcon data-icon="inline-start" />
            {actionLabel}
          </Link>
        </Button>
      ) : null}
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
    <div className="rounded-2xl border !border-transparent bg-card p-4 shadow-[var(--surface-shadow-soft)]">
      <ListRowsSkeleton rows={6} />
    </div>
  );
}
