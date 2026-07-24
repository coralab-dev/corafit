"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const statusBadgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        active:
          "border-primary/20 bg-primary/10 text-primary",
        paused:
          "border-yellow-500/20 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
        inactive:
          "border-muted bg-muted/50 text-muted-foreground",
        archived:
          "border-border bg-background text-muted-foreground",
        draft:
          "border-orange-500/20 bg-orange-500/10 text-orange-600 dark:text-orange-400",
        published:
          "border-primary/20 bg-primary/10 text-primary",
        "with-plan":
          "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        "no-plan":
          "border-muted bg-muted/50 text-muted-foreground",
        "access-active":
          "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        "access-pending":
          "border-yellow-500/20 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
        success:
          "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        warning:
          "border-yellow-500/20 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
        danger:
          "border-destructive/20 bg-destructive/10 text-destructive",
        completed:
          "border-primary/20 bg-primary/10 text-primary",
        pending:
          "border-yellow-500/20 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
        error:
          "border-destructive/20 bg-destructive/10 text-destructive",
      },
    },
    defaultVariants: {
      variant: "active",
    },
  },
);

type StatusVariant = VariantProps<typeof statusBadgeVariants>["variant"];

interface StatusBadgeProps {
  variant: StatusVariant;
  label: string;
}

export function StatusBadge({ variant, label }: StatusBadgeProps) {
  return (
    <span className={cn(statusBadgeVariants({ variant }))}>
      <span className="size-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}
