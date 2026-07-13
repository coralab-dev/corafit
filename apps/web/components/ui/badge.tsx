import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-normal whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "border-border bg-card text-foreground",
        muted: "border-transparent bg-muted text-muted-foreground",
        success:
          "border-transparent bg-emerald-50 text-emerald-700 dark:bg-emerald-950/45 dark:text-emerald-300",
        warning:
          "border-transparent bg-amber-50 text-amber-700 dark:bg-amber-950/45 dark:text-amber-300",
        danger:
          "border-transparent bg-red-50 text-red-700 dark:bg-red-950/45 dark:text-red-300",
        info:
          "border-transparent bg-sky-50 text-sky-700 dark:bg-sky-950/45 dark:text-sky-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
