"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function WorkspaceFrame({
  children,
  className,
  header,
}: {
  children: ReactNode;
  className?: string;
  header?: ReactNode;
}) {
  return (
    <div className={cn("flex min-h-screen flex-col bg-background", className)}>
      {header}
      {children}
    </div>
  );
}

export function WorkspaceHeader({
  actions,
  description,
  title,
}: {
  actions?: ReactNode;
  description?: string;
  title: string;
}) {
  return (
    <header className="flex min-h-20 flex-col gap-3 border-b bg-background/80 px-5 py-4 md:flex-row md:items-center md:justify-between md:px-6">
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-bold tracking-normal">{title}</h1>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2 md:justify-end">{actions}</div>
      ) : null}
    </header>
  );
}

export function WorkspaceSplit({
  main,
  mainClassName,
  side,
  sideClassName,
}: {
  main: ReactNode;
  mainClassName?: string;
  side?: ReactNode;
  sideClassName?: string;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col xl:flex-row">
      <div className={cn("min-w-0 flex-1 border-r border-border", mainClassName)}>{main}</div>
      {side ? (
        <div
          className={cn(
            "min-w-0 bg-background xl:w-[320px] xl:min-w-[280px] xl:max-w-[420px] xl:resize-x xl:overflow-auto",
            sideClassName,
          )}
        >
          {side}
        </div>
      ) : null}
    </div>
  );
}

export function WorkspacePanel({
  children,
  className,
  description,
  icon,
  title,
}: {
  children: ReactNode;
  className?: string;
  description?: string;
  icon?: ReactNode;
  title?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border !border-transparent bg-card shadow-[var(--surface-shadow)]",
        className,
      )}
    >
      {title ? (
        <div className="flex items-start justify-between gap-4 border-b px-4 py-4">
          <div>
            <h2 className="text-sm font-semibold tracking-normal">{title}</h2>
            {description ? (
              <p className="mt-1 text-xs text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {icon ? (
            <div className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              {icon}
            </div>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
