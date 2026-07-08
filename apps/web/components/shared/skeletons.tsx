"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { WorkspacePanel } from "@/components/layout/workspace-shell";
import { cn } from "@/lib/utils";

export function MetricStripSkeleton({
  className,
  count = 4,
}: {
  className?: string;
  count?: number;
}) {
  return (
    <div
      className={cn(
        "grid overflow-hidden rounded-md border bg-card sm:grid-cols-2 xl:grid-cols-4",
        className,
      )}
      role="status"
      aria-label="Cargando metricas"
    >
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="flex min-h-24 items-start gap-3 border-b px-4 py-4 last:border-b-0 sm:[&:nth-child(odd)]:border-r xl:border-b-0 xl:border-r xl:last:border-r-0"
        >
          <Skeleton className="mt-0.5 size-4 shrink-0 rounded" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-7 w-14" />
            <Skeleton className="mt-2 h-3 w-28" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function PanelSkeleton({
  className,
  rows = 3,
  titleWidth = "w-40",
}: {
  className?: string;
  rows?: number;
  titleWidth?: string;
}) {
  return (
    <WorkspacePanel className={className}>
      <div className="border-b px-4 py-4">
        <Skeleton className={cn("h-4", titleWidth)} />
        <Skeleton className="mt-2 h-3 w-56 max-w-full" />
      </div>
      <div className="space-y-3 p-4">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="flex items-center gap-3">
            <Skeleton className="size-9 shrink-0 rounded-md" />
            <div className="min-w-0 flex-1">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="mt-2 h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </WorkspacePanel>
  );
}

export function ListRowsSkeleton({
  className,
  rows = 5,
}: {
  className?: string;
  rows?: number;
}) {
  return (
    <div
      className={cn("overflow-hidden rounded-md border bg-card", className)}
      role="status"
      aria-label="Cargando lista"
    >
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="grid gap-3 border-b p-3 last:border-b-0 md:grid-cols-[minmax(0,1.4fr)_minmax(10rem,0.8fr)_auto] md:items-center"
        >
          <div className="flex min-w-0 items-center gap-3">
            <Skeleton className="size-10 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1">
              <Skeleton className="h-4 w-3/5" />
              <Skeleton className="mt-2 h-3 w-2/5" />
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-8 w-20 justify-self-start md:justify-self-end" />
        </div>
      ))}
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <Card>
      <CardContent
        className="space-y-5 p-6"
        role="status"
        aria-label="Cargando detalle"
      >
        <div className="flex items-start gap-4">
          <Skeleton className="size-14 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-6 w-48 max-w-full" />
            <Skeleton className="mt-3 h-4 w-64 max-w-full" />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="rounded-md border p-4">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-3 h-4 w-32" />
            </div>
          ))}
        </div>
        <PanelSkeleton rows={2} />
      </CardContent>
    </Card>
  );
}

export function TableSkeleton({
  className,
  rows = 5,
}: {
  className?: string;
  rows?: number;
}) {
  return (
    <div
      className={cn("overflow-hidden rounded-md border bg-card", className)}
      role="status"
      aria-label="Cargando tabla"
    >
      <div className="hidden border-b px-3 py-3 md:grid md:grid-cols-[1.2fr_1fr_1fr_0.7fr_0.7fr_2rem] md:gap-3">
        {[0, 1, 2, 3, 4, 5].map((item) => (
          <Skeleton key={item} className="h-3 w-20" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="grid gap-3 border-b p-3 last:border-b-0 md:grid-cols-[1.2fr_1fr_1fr_0.7fr_0.7fr_2rem] md:items-center"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="mt-2 h-3 w-24" />
            </div>
          </div>
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="size-8" />
        </div>
      ))}
    </div>
  );
}
