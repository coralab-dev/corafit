"use client";

import {
  AlertTriangleIcon,
  CheckIcon,
  InfoIcon,
  Loader2Icon,
  XCircleIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type NotifyKind = "success" | "error" | "warning" | "info" | "loading";

type NotifyOptions = {
  description?: ReactNode;
  duration?: number;
  id?: string | number;
};

type NotifyPromiseMessages<T> = {
  loading: string;
  success: string | ((data: T) => string);
  error: string | ((error: unknown) => string);
};

const defaultDuration = 3600;
const loadingDuration = Infinity;

const kindStyles: Record<
  NotifyKind,
  { icon: ReactNode; ring: string; tone: string }
> = {
  success: {
    icon: <CheckIcon className="size-3.5" />,
    ring: "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20 dark:text-emerald-300",
    tone: "shadow-emerald-950/5",
  },
  error: {
    icon: <XCircleIcon className="size-3.5" />,
    ring: "bg-red-500/10 text-red-600 ring-red-500/20 dark:text-red-300",
    tone: "shadow-red-950/5",
  },
  warning: {
    icon: <AlertTriangleIcon className="size-3.5" />,
    ring: "bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-300",
    tone: "shadow-amber-950/5",
  },
  info: {
    icon: <InfoIcon className="size-3.5" />,
    ring: "bg-sky-500/10 text-sky-700 ring-sky-500/20 dark:text-sky-300",
    tone: "shadow-sky-950/5",
  },
  loading: {
    icon: <Loader2Icon className="size-3.5 animate-spin" />,
    ring: "bg-muted text-muted-foreground ring-border",
    tone: "shadow-foreground/5",
  },
};

function renderToast(kind: NotifyKind, message: string, options: NotifyOptions = {}) {
  const styles = kindStyles[kind];

  return (
    <div
      className={cn(
        "pointer-events-auto flex max-w-[calc(100vw-2rem)] items-center gap-2.5 rounded-full border border-border/80 bg-popover/95 px-3 py-2 text-popover-foreground shadow-lg shadow-black/8 backdrop-blur-xl",
        "dark:border-white/10 dark:bg-popover/92",
        styles.tone,
      )}
    >
      <span
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-full ring-1",
          styles.ring,
        )}
        aria-hidden="true"
      >
        {styles.icon}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-medium leading-5">
          {message}
        </span>
        {options.description ? (
          <span className="block max-w-80 truncate text-xs leading-4 text-muted-foreground">
            {options.description}
          </span>
        ) : null}
      </span>
    </div>
  );
}

function show(kind: NotifyKind, message: string, options: NotifyOptions = {}) {
  return toast.custom(() => renderToast(kind, message, options), {
    duration: options.duration ?? (kind === "loading" ? loadingDuration : defaultDuration),
    id: options.id,
  });
}

export const notify = {
  success: (message: string, options?: NotifyOptions) => show("success", message, options),
  error: (message: string, options?: NotifyOptions) => show("error", message, options),
  warning: (message: string, options?: NotifyOptions) => show("warning", message, options),
  info: (message: string, options?: NotifyOptions) => show("info", message, options),
  loading: (message: string, options?: NotifyOptions) => show("loading", message, options),
  refresh: (message = "Actualizando...", options?: NotifyOptions) =>
    show("loading", message, {
      id: "corafit-refresh",
      ...options,
      duration: options?.duration ?? loadingDuration,
    }),
  dismiss: (id?: string | number) => toast.dismiss(id),
  promise: async <T,>(
    promise: Promise<T>,
    messages: NotifyPromiseMessages<T>,
    options: NotifyOptions = {},
  ) => {
    const id = notify.loading(messages.loading, {
      ...options,
      duration: loadingDuration,
    });

    try {
      const data = await promise;
      notify.success(
        typeof messages.success === "function" ? messages.success(data) : messages.success,
        { ...options, id },
      );
      return data;
    } catch (error) {
      notify.error(
        typeof messages.error === "function" ? messages.error(error) : messages.error,
        { ...options, id },
      );
      throw error;
    }
  },
};
