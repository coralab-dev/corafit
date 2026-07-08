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
    <div className="flex min-h-44 flex-col items-center justify-center gap-3 rounded-lg border bg-background p-6 text-center">
      <UserRoundIcon className="text-muted-foreground" />
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
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
  return <ListRowsSkeleton rows={6} />;
}
