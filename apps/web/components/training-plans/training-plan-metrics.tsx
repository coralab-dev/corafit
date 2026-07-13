import {
  ArchiveIcon,
  CheckCircle2Icon,
  FilePenLineIcon,
  FilesIcon,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { TrainingPlanMetrics as TrainingPlanMetricsValue } from "@/hooks/use-training-plans";
import { cn } from "@/lib/utils";

type MetricTone = "default" | "success" | "warning" | "muted";

const metricToneStyles: Record<MetricTone, string> = {
  default: "bg-accent text-primary",
  success: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/45 dark:text-emerald-300",
  warning: "bg-amber-50 text-amber-700 dark:bg-amber-950/45 dark:text-amber-300",
  muted: "bg-muted text-muted-foreground",
};

export function TrainingPlanMetrics({
  isLoading,
  metrics,
}: {
  isLoading: boolean;
  metrics: TrainingPlanMetricsValue;
}) {
  const items = [
    {
      icon: <FilesIcon className="size-4" />,
      label: "Total de planes",
      tone: "default" as const,
      value: metrics.total,
    },
    {
      icon: <CheckCircle2Icon className="size-4" />,
      label: "Activos",
      tone: "success" as const,
      value: metrics.active,
    },
    {
      icon: <FilePenLineIcon className="size-4" />,
      label: "Borradores",
      tone: "warning" as const,
      value: metrics.draft,
    },
    {
      icon: <ArchiveIcon className="size-4" />,
      label: "Archivados",
      tone: "muted" as const,
      value: metrics.archived,
    },
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumen de planes">
      {items.map((item) => (
        <article
          key={item.label}
          className="rounded-2xl border !border-transparent bg-card p-4 shadow-[var(--surface-shadow-soft)]"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-muted-foreground">{item.label}</p>
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-xl",
                metricToneStyles[item.tone],
              )}
            >
              {item.icon}
            </span>
          </div>
          <div className="mt-4 text-2xl font-bold tracking-normal">
            {isLoading && item.value === null ? (
              <Skeleton className="h-8 w-14" />
            ) : (
              item.value ?? "—"
            )}
          </div>
        </article>
      ))}
    </section>
  );
}
