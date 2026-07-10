import {
  BarChart3Icon,
  CalendarDaysIcon,
  CheckCircle2Icon,
  DumbbellIcon,
  FilePenLineIcon,
  Layers3Icon,
  Loader2Icon,
  PlusIcon,
  SearchIcon,
} from "lucide-react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  type TrainingPlan,
  type TrainingPlanStatus,
} from "@/hooks/use-training-plans";
import { cn } from "@/lib/utils";

export type PlanSourceFilter = "all" | "system" | "mine";

const sourceFilters: Array<{ label: string; value: PlanSourceFilter }> = [
  { label: "Todos", value: "all" },
  { label: "Plantillas", value: "system" },
  { label: "Mis planes", value: "mine" },
];

const statusLabels: Record<TrainingPlanStatus, string> = {
  active: "Activo",
  archived: "Archivado",
  draft: "Borrador",
};

const levelLabels: Record<string, string> = {
  advanced: "Avanzado",
  beginner: "Principiante",
  intermediate: "Intermedio",
};

const statusBadgeVariants: Record<TrainingPlanStatus, "success" | "warning" | "muted"> = {
  active: "success",
  archived: "muted",
  draft: "warning",
};

export function TrainingPlanLibrary({
  error,
  isLoading,
  items,
  onCreatePlan,
  onQueryChange,
  onSourceFilterChange,
  onStatusChange,
  query,
  resultCount,
  sourceFilter,
  status,
  total,
}: {
  error: string;
  isLoading: boolean;
  items: TrainingPlan[];
  onCreatePlan: () => void;
  onQueryChange: (query: string) => void;
  onSourceFilterChange: (filter: PlanSourceFilter) => void;
  onStatusChange: (status: TrainingPlanStatus | "all") => void;
  query: string;
  resultCount: number;
  sourceFilter: PlanSourceFilter;
  status: TrainingPlanStatus | "all";
  total: number;
}) {
  const hasActiveFilters = Boolean(query.trim()) || status !== "all" || sourceFilter !== "all";
  const isInitialLoading = isLoading && items.length === 0 && total === 0;

  return (
    <section className="overflow-hidden rounded-2xl border !border-transparent bg-card shadow-[var(--surface-shadow)]">
      <div className="grid gap-3 border-b p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_auto_minmax(12rem,auto)] lg:items-center">
        <div className="relative min-w-0">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Buscar planes"
            className="h-10 bg-background pl-10"
            placeholder="Buscar planes por nombre"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
          />
        </div>

        <div className="flex min-w-0 items-center gap-1 overflow-x-auto rounded-xl border bg-background p-1">
          {sourceFilters.map((filter) => (
            <button
              key={filter.value}
              className={cn(
                "h-8 shrink-0 rounded-lg px-3 text-xs font-semibold transition-colors",
                sourceFilter === filter.value
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
              type="button"
              onClick={() => onSourceFilterChange(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <label className="flex h-10 items-center gap-2 rounded-xl border bg-background px-3 text-sm text-muted-foreground">
          <span className="text-xs">Estado</span>
          <select
            aria-label="Filtrar por estado"
            className="min-w-0 flex-1 bg-transparent font-medium text-foreground outline-none"
            value={status}
            onChange={(event) =>
              onStatusChange(event.target.value as TrainingPlanStatus | "all")
            }
          >
            <option value="all">Todos</option>
            <option value="active">Activos</option>
            <option value="draft">Borradores</option>
            <option value="archived">Archivados</option>
          </select>
        </label>
      </div>

      <div className="flex min-h-12 items-center justify-between gap-3 border-b px-4 py-3 sm:px-5">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{resultCount}</span>{" "}
          {resultCount === 1 ? "plan" : "planes"}
        </p>
        {isLoading && !isInitialLoading ? (
          <span className="inline-flex items-center gap-2 text-xs text-muted-foreground" role="status">
            <Loader2Icon className="size-3.5 animate-spin" />
            Actualizando
          </span>
        ) : null}
      </div>

      {error ? (
        <div className="m-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive sm:m-5">
          {error}
        </div>
      ) : null}

      {!error && isInitialLoading ? <PlanLibrarySkeleton /> : null}

      {!error && !isInitialLoading && items.length > 0 ? (
        <>
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs font-semibold text-muted-foreground">
                  <th className="px-5 py-3 font-semibold">Plan</th>
                  <th className="px-4 py-3 font-semibold">Duración</th>
                  <th className="px-4 py-3 font-semibold">Nivel</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                  <th className="px-4 py-3 font-semibold">Origen</th>
                  <th className="px-5 py-3 text-right font-semibold">Acción</th>
                </tr>
              </thead>
              <tbody>
                {items.map((plan) => (
                  <TrainingPlanTableRow key={plan.id} plan={plan} />
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 p-3 lg:hidden">
            {items.map((plan) => (
              <TrainingPlanMobileCard key={plan.id} plan={plan} />
            ))}
          </div>
        </>
      ) : null}

      {!error && !isInitialLoading && items.length === 0 && !isLoading ? (
        <EmptyTrainingPlans
          hasActiveFilters={hasActiveFilters}
          onCreatePlan={onCreatePlan}
        />
      ) : null}
    </section>
  );
}

function TrainingPlanTableRow({ plan }: { plan: TrainingPlan }) {
  return (
    <tr className="border-b transition-colors last:border-b-0 hover:bg-muted/35">
      <td className="max-w-[24rem] px-5 py-4">
        <PlanIdentity plan={plan} />
      </td>
      <td className="whitespace-nowrap px-4 py-4 text-muted-foreground">
        {plan.durationWeeks} semanas
      </td>
      <td className="whitespace-nowrap px-4 py-4 text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <BarChart3Icon className="size-4" />
          {plan.level ? (levelLabels[plan.level] ?? plan.level) : "Sin nivel"}
        </span>
      </td>
      <td className="px-4 py-4">
        <PlanStatusBadge status={plan.status} />
      </td>
      <td className="px-4 py-4">
        <PlanOriginBadge isSystemTemplate={Boolean(plan.isSystemTemplate)} />
      </td>
      <td className="px-5 py-4 text-right">
        <PlanAction plan={plan} />
      </td>
    </tr>
  );
}

function TrainingPlanMobileCard({ plan }: { plan: TrainingPlan }) {
  return (
    <article className="rounded-xl border !border-transparent bg-background p-4 shadow-[var(--surface-shadow-soft)]">
      <div className="flex items-start justify-between gap-3">
        <PlanIdentity plan={plan} />
        <PlanStatusBadge status={plan.status} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 border-y py-3 text-sm">
        <PlanMeta icon={CalendarDaysIcon} label="Duración" value={`${plan.durationWeeks} semanas`} />
        <PlanMeta
          icon={BarChart3Icon}
          label="Nivel"
          value={plan.level ? (levelLabels[plan.level] ?? plan.level) : "Sin nivel"}
        />
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <PlanOriginBadge isSystemTemplate={Boolean(plan.isSystemTemplate)} />
        <PlanAction plan={plan} />
      </div>
    </article>
  );
}

function PlanIdentity({ plan }: { plan: TrainingPlan }) {
  const { icon: Icon, className } = getPlanIcon(plan);

  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", className)}>
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="truncate font-semibold">{plan.name}</p>
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
          {plan.goal || plan.generalNotes || "Sin objetivo registrado"}
        </p>
      </div>
    </div>
  );
}

function PlanStatusBadge({ status }: { status: TrainingPlanStatus }) {
  return <Badge variant={statusBadgeVariants[status]}>{statusLabels[status]}</Badge>;
}

function PlanOriginBadge({ isSystemTemplate }: { isSystemTemplate: boolean }) {
  return (
    <Badge variant={isSystemTemplate ? "warning" : "info"}>
      {isSystemTemplate ? "Plantilla del sistema" : "Mi plan"}
    </Badge>
  );
}

function PlanAction({ plan }: { plan: TrainingPlan }) {
  const label = getPlanActionLabel(plan);

  return (
    <Button
      asChild
      className={cn(
        "shrink-0",
        plan.status === "draft" && !plan.isSystemTemplate && "border-primary/35 text-primary hover:bg-primary/10",
      )}
      size="sm"
      variant="outline"
    >
      <Link href={`/training-plans/${plan.id}/edit`}>{label}</Link>
    </Button>
  );
}

function PlanMeta({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </p>
      <p className="mt-1 truncate font-medium">{value}</p>
    </div>
  );
}

function EmptyTrainingPlans({
  hasActiveFilters,
  onCreatePlan,
}: {
  hasActiveFilters: boolean;
  onCreatePlan: () => void;
}) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-accent text-primary">
        <DumbbellIcon className="size-5" />
      </div>
      <div>
        <p className="font-semibold">
          {hasActiveFilters ? "No hay planes para estos filtros" : "No hay planes todavía"}
        </p>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          {hasActiveFilters
            ? "Ajusta la búsqueda o cambia los filtros para ver otros planes."
            : "Crea tu primer plan para empezar a organizar rutinas reutilizables."}
        </p>
      </div>
      {!hasActiveFilters ? (
        <Button size="sm" type="button" onClick={onCreatePlan}>
          <PlusIcon data-icon="inline-start" />
          Nuevo plan
        </Button>
      ) : null}
    </div>
  );
}

function PlanLibrarySkeleton() {
  return (
    <div className="p-4 sm:p-5" role="status" aria-label="Cargando planes">
      <div className="hidden space-y-0 lg:block">
        <div className="grid grid-cols-[minmax(0,1.7fr)_1fr_1fr_0.8fr_1fr_7rem] gap-4 border-b px-1 pb-3">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-3 w-20" />
          ))}
        </div>
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="grid grid-cols-[minmax(0,1.7fr)_1fr_1fr_0.8fr_1fr_7rem] items-center gap-4 border-b px-1 py-4 last:border-b-0">
            <div className="flex items-center gap-3">
              <Skeleton className="size-11 rounded-xl" />
              <div className="min-w-0 flex-1">
                <Skeleton className="h-4 w-40 max-w-full" />
                <Skeleton className="mt-2 h-3 w-56 max-w-full" />
              </div>
            </div>
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-9 w-24" />
          </div>
        ))}
      </div>
      <div className="space-y-3 lg:hidden">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="rounded-xl border p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="size-11 rounded-xl" />
              <div className="min-w-0 flex-1">
                <Skeleton className="h-4 w-40 max-w-full" />
                <Skeleton className="mt-2 h-3 w-full" />
              </div>
            </div>
            <Skeleton className="mt-4 h-10 w-full" />
            <Skeleton className="mt-3 h-9 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

function getPlanActionLabel(plan: TrainingPlan) {
  if (plan.isSystemTemplate) {
    return "Ver plantilla";
  }

  return plan.status === "draft" ? "Abrir editor" : "Ver plan";
}

function getPlanIcon(plan: TrainingPlan): { icon: LucideIcon; className: string } {
  if (plan.isSystemTemplate) {
    return {
      className: "bg-amber-50 text-amber-700 dark:bg-amber-950/45 dark:text-amber-300",
      icon: Layers3Icon,
    };
  }

  if (plan.status === "draft") {
    return {
      className: "bg-amber-50 text-amber-700 dark:bg-amber-950/45 dark:text-amber-300",
      icon: FilePenLineIcon,
    };
  }

  return {
    className: "bg-accent text-primary",
    icon: plan.status === "active" ? DumbbellIcon : CheckCircle2Icon,
  };
}
