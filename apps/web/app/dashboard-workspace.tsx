"use client";

import type { ReactNode } from "react";
import {
  AlertTriangleIcon,
  CalendarCheckIcon,
  CheckCircle2Icon,
  ChevronRightIcon,
  CircleIcon,
  DumbbellIcon,
  LinkIcon,
  PlusIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
  TargetIcon,
  UserRoundIcon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import type { badgeVariants } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  WorkspaceFrame,
  WorkspaceHeader,
  WorkspacePanel,
  WorkspaceSplit,
} from "@/components/layout/workspace-shell";
import { ListRowsSkeleton, PanelSkeleton } from "@/components/shared/skeletons";
import { useDashboard } from "@/hooks/use-dashboard";
import type { DashboardAttentionItem } from "@/hooks/use-dashboard";
import { cn } from "@/lib/utils";
import { notify } from "@/lib/notify";

type BadgeVariant = NonNullable<Parameters<typeof badgeVariants>[0]>["variant"];
type MetricTone = "default" | "success" | "warning" | "danger" | "muted";
type StatTone = "default" | "success" | "warning" | "info";

type ChecklistItem = {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  href: string;
  icon: ReactNode;
};

export function DashboardWorkspace() {
  const { error, isApiReady, isInitialLoading, isRefreshing, refresh, stats } = useDashboard();
  const onboarding = stats?.onboarding;

  useEffect(() => {
    if (!isRefreshing) {
      notify.dismiss("dashboard-refresh");
      return;
    }

    const timer = window.setTimeout(() => {
      notify.refresh("Actualizando dashboard", { id: "dashboard-refresh" });
    }, 500);

    return () => {
      window.clearTimeout(timer);
      notify.dismiss("dashboard-refresh");
    };
  }, [isRefreshing]);

  const checklist = stats ? getChecklist(stats.onboarding.checklist) : [];
  const completedCount = checklist.filter((item) => item.completed).length;
  const nextStep = checklist.find((item) => !item.completed);

  return (
    <WorkspaceFrame
      header={
        <WorkspaceHeader
          description="Detecta clientes que necesitan seguimiento y revisa tu operacion semanal."
          title="Dashboard"
          actions={
            <Button asChild className="w-full sm:w-auto">
              <Link href="/clients">
                <PlusIcon className="size-4" />
                Nuevo cliente
              </Link>
            </Button>
          }
        />
      }
    >
      {isInitialLoading ? (
        <DashboardSkeleton />
      ) : error && !isApiReady ? (
        <DashboardErrorState
          actionLabel="Reintentar"
          description="Necesitamos una sesion activa para cargar tu operacion."
          onRetry={refresh}
          title="Inicia sesion para ver tu dashboard."
        />
      ) : error && !stats ? (
        <DashboardErrorState
          actionLabel="Reintentar"
          description="Intenta cargar de nuevo el dashboard del coach."
          onRetry={refresh}
          title="No pudimos cargar el dashboard."
        />
      ) : stats ? (
        <WorkspaceSplit
          mainClassName="border-r-0"
          sideClassName="xl:w-[360px] xl:min-w-[340px] xl:max-w-[480px]"
          main={
            <div className="flex flex-col gap-5 bg-background p-4 sm:p-6">
              {error ? (
                <div className="rounded-2xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              ) : null}

              <DashboardMetricGrid
                items={[
                  {
                    helper:
                      stats.summary.activeClients === 0
                        ? "Sin clientes activos."
                        : "En seguimiento.",
                    icon: <UsersIcon className="size-5" />,
                    label: "Clientes activos",
                    value: stats.summary.activeClients,
                  },
                  {
                    helper:
                      stats.summary.clientsUpToDate === 0
                        ? "Aun sin clientes al dia."
                        : "Sin alertas inmediatas.",
                    icon: <ShieldCheckIcon className="size-5" />,
                    label: "Al dia",
                    tone: "success",
                    value: stats.summary.clientsUpToDate,
                  },
                  {
                    helper:
                      stats.summary.clientsAtRisk === 0
                        ? "Sin alertas."
                        : "Requieren revision.",
                    icon: <AlertTriangleIcon className="size-5" />,
                    label: "En riesgo",
                    tone: "danger",
                    value: stats.summary.clientsAtRisk,
                  },
                  {
                    helper:
                      stats.summary.clientsWithoutActivity === 0
                        ? "Sin detenidos."
                        : "14 dias sin completar.",
                    icon: <CircleIcon className="size-5" />,
                    label: "Sin actividad",
                    tone: "warning",
                    value: stats.summary.clientsWithoutActivity,
                  },
                  {
                    helper:
                      stats.summary.clientsWithoutPlan === 0
                        ? "Todos iniciados."
                        : "Nunca tuvieron plan.",
                    icon: <TargetIcon className="size-5" />,
                    label: "Sin plan inicial",
                    tone: "warning",
                    value: stats.summary.clientsWithoutPlan,
                  },
                  {
                    helper: "Completadas esta semana.",
                    icon: <CalendarCheckIcon className="size-5" />,
                    label: "Sesiones completadas",
                    tone: "muted",
                    value: stats.summary.sessionsCompletedThisWeek,
                  },
                ]}
              />

              {stats.summary.activeClients === 0 && onboarding?.totalClients === 0 ? (
                <DashboardEmptyState />
              ) : null}

              <AttentionPanel items={stats.attention} />

              {nextStep ? <NextStepCard item={nextStep} /> : null}

              <section className="grid gap-3 sm:grid-cols-3">
                <QuickLink
                  description="Ver y gestionar clientes"
                  href="/clients"
                  icon={<UsersIcon className="size-4" />}
                  title="Clientes"
                />
                <QuickLink
                  description="Crear y editar planes"
                  href="/training-plans"
                  icon={<DumbbellIcon className="size-4" />}
                  title="Planes"
                />
                <QuickLink
                  description="Vincular plan a cliente"
                  href="/clients"
                  icon={<CheckCircle2Icon className="size-4" />}
                  title="Asignar plan"
                />
              </section>
            </div>
          }
          side={
            <div className="space-y-5 p-4 xl:pl-3 xl:pr-5">
              {onboarding ? (
                <WorkspacePanel
                  title="Configuracion inicial"
                  description="Conteo general; sin plan activo incluye planes finalizados."
                >
                  <div className="grid grid-cols-2 gap-3 p-4">
                    <SmallStat
                      icon={<UsersIcon className="size-4" />}
                      label="Clientes"
                      value={onboarding.totalClients}
                    />
                    <SmallStat
                      icon={<DumbbellIcon className="size-4" />}
                      label="Planes"
                      tone="info"
                      value={onboarding.totalPlans}
                    />
                    <SmallStat
                      icon={<AlertTriangleIcon className="size-4" />}
                      label="Sin plan activo"
                      tone="warning"
                      value={onboarding.clientsWithoutPlan}
                    />
                    <SmallStat
                      icon={<LinkIcon className="size-4" />}
                      label="Con acceso"
                      tone="success"
                      value={onboarding.clientsWithAccess}
                    />
                  </div>
                </WorkspacePanel>
              ) : null}

              <OnboardingChecklist
                completedCount={completedCount}
                items={checklist}
              />
            </div>
          }
        />
      ) : null}
    </WorkspaceFrame>
  );
}

function getChecklist(checklist: {
  hasCreatedClient: boolean;
  hasCreatedOrSelectedPlan: boolean;
  hasAssignedPlan: boolean;
  hasGeneratedAccess: boolean;
  hasPreviewedPortal: boolean;
}): ChecklistItem[] {
  return [
    {
      id: "create-client",
      label: "Crear tu primer cliente",
      description: "Registra al menos un cliente en tu organizacion.",
      completed: checklist.hasCreatedClient,
      href: "/clients",
      icon: <UserRoundIcon className="size-4" />,
    },
    {
      id: "select-plan",
      label: "Crear o elegir un plan",
      description: "Crea un plan desde cero o duplica uno base del sistema.",
      completed: checklist.hasCreatedOrSelectedPlan,
      href: "/training-plans",
      icon: <DumbbellIcon className="size-4" />,
    },
    {
      id: "assign-plan",
      label: "Asignar plan a un cliente",
      description: "Vincula un plan de entrenamiento a un cliente.",
      completed: checklist.hasAssignedPlan,
      href: "/clients",
      icon: <CheckCircle2Icon className="size-4" />,
    },
    {
      id: "generate-access",
      label: "Generar acceso al portal",
      description: "Crea un link y PIN para que tu cliente entre a su portal.",
      completed: checklist.hasGeneratedAccess,
      href: "/clients",
      icon: <LinkIcon className="size-4" />,
    },
    {
      id: "preview-portal",
      label: "Ver portal como cliente",
      description: "Abre el portal con el link generado para validar la experiencia.",
      completed: checklist.hasPreviewedPortal,
      href: "/clients",
      icon: <SmartphoneIcon className="size-4" />,
    },
  ];
}

function DashboardMetricGrid({
  items,
}: {
  items: Array<{
    helper: string;
    icon: ReactNode;
    label: string;
    tone?: MetricTone;
    value: ReactNode;
  }>;
}) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
      {items.map((item) => (
        <DashboardMetricCard key={item.label} {...item} />
      ))}
    </section>
  );
}

function DashboardMetricCard({
  helper,
  icon,
  label,
  tone = "default",
  value,
}: {
  helper: string;
  icon: ReactNode;
  label: string;
  tone?: MetricTone;
  value: ReactNode;
}) {
  return (
    <article className="rounded-2xl border bg-card p-4 shadow-[0_10px_30px_rgba(21,23,26,0.04)] dark:shadow-none">
      <div className="flex items-start justify-between gap-3">
        <div className={cn("flex size-10 items-center justify-center rounded-xl", metricToneStyles[tone])}>
          {icon}
        </div>
        <Badge variant={tone === "danger" ? "danger" : tone === "success" ? "success" : tone === "warning" ? "warning" : "outline"}>
          {label}
        </Badge>
      </div>
      <p className="mt-5 text-3xl font-bold tracking-normal">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{helper}</p>
    </article>
  );
}

const metricToneStyles: Record<MetricTone, string> = {
  default: "bg-accent text-primary",
  success: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/45 dark:text-emerald-300",
  warning: "bg-amber-50 text-amber-700 dark:bg-amber-950/45 dark:text-amber-300",
  danger: "bg-red-50 text-red-700 dark:bg-red-950/45 dark:text-red-300",
  muted: "bg-muted text-muted-foreground",
};

function AttentionPanel({ items }: { items: DashboardAttentionItem[] }) {
  return (
    <WorkspacePanel
      title="Requieren seguimiento"
      description="Planes finalizados, pausas de actividad y clientes sin plan inicial."
      icon={<AlertTriangleIcon className="size-4" />}
    >
      {items.length > 0 ? (
        <div className="divide-y">
          {items.map((item) => (
            <AttentionRow key={item.clientId} item={item} />
          ))}
        </div>
      ) : (
        <div className="p-5">
          <div className="rounded-2xl border bg-secondary/55 p-5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/45 dark:text-emerald-300">
              <CheckCircle2Icon className="size-5" />
            </div>
            <p className="mt-4 font-semibold">Todo en orden por ahora.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              No hay clientes que requieran seguimiento inmediato.
            </p>
          </div>
        </div>
      )}
    </WorkspacePanel>
  );
}

const attentionLabels: Record<DashboardAttentionItem["status"], string> = {
  without_plan: "Sin plan",
  future_plan: "Plan programado",
  plan_finished: "Plan finalizado",
  without_activity: "Sin actividad",
  at_risk: "En riesgo",
};

const attentionReasons: Record<DashboardAttentionItem["status"], string> = {
  without_plan: "Necesita que le asignes un plan.",
  future_plan: "Su plan todavia no inicia.",
  plan_finished: "Su plan termino y necesita revision.",
  without_activity: "No registra sesiones completadas en los ultimos 14 dias.",
  at_risk: "Tiene sesiones esperadas sin completar esta semana.",
};

const attentionBadgeVariants: Record<DashboardAttentionItem["status"], BadgeVariant> = {
  without_plan: "warning",
  future_plan: "info",
  plan_finished: "warning",
  without_activity: "muted",
  at_risk: "danger",
};

function AttentionRow({ item }: { item: DashboardAttentionItem }) {
  return (
    <div className="group flex flex-col gap-4 px-4 py-4 transition-colors hover:bg-secondary/35 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold">{item.name}</p>
          <Badge variant={attentionBadgeVariants[item.status]}>
            {attentionLabels[item.status]}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {attentionReasons[item.status] ?? item.reason}
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
          {item.currentPlan ? (
            <span className="rounded-full border bg-background px-2.5 py-1">
              Plan: {item.currentPlan.name}
            </span>
          ) : null}
          {item.lastCompletedSessionAt ? (
            <span className="rounded-full border bg-background px-2.5 py-1">
              Ultima sesion: {formatDisplayDate(item.lastCompletedSessionAt)}
            </span>
          ) : null}
          {item.nextExpectedSessionDate ? (
            <span className="rounded-full border bg-background px-2.5 py-1">
              Proxima esperada: {formatDisplayDate(item.nextExpectedSessionDate)}
            </span>
          ) : null}
        </div>
      </div>
      <Button asChild className="w-full shrink-0 md:w-auto" size="sm" variant="outline">
        <Link href={`/clients?selected=${item.clientId}`}>Ver cliente</Link>
      </Button>
    </div>
  );
}

function NextStepCard({ item }: { item: ChecklistItem }) {
  return (
    <section className="rounded-2xl border bg-card p-4 shadow-[0_10px_30px_rgba(21,23,26,0.04)] dark:shadow-none">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-primary">
            {item.icon}
          </div>
          <div>
            <Badge variant="default">Siguiente paso</Badge>
            <h2 className="mt-3 text-lg font-bold tracking-normal">{item.label}</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{item.description}</p>
          </div>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link href={item.href}>
            Continuar
            <ChevronRightIcon className="size-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
}

function QuickLink({
  description,
  href,
  icon,
  title,
}: {
  description: string;
  href: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <Link
      className="group flex items-center gap-3 rounded-2xl border bg-card p-4 transition-[background,border-color,transform] hover:-translate-y-0.5 hover:border-primary/25 hover:bg-secondary/50"
      href={href}
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <ChevronRightIcon className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
    </Link>
  );
}

function SmallStat({
  icon,
  label,
  tone = "default",
  value,
}: {
  icon: ReactNode;
  label: string;
  tone?: StatTone;
  value: number;
}) {
  return (
    <div className="rounded-2xl border bg-background p-3">
      <div className="flex items-center justify-between gap-2">
        <div className={cn("flex size-8 items-center justify-center rounded-lg", statToneStyles[tone])}>
          {icon}
        </div>
        <p className="text-2xl font-bold tracking-normal">{value}</p>
      </div>
      <p className="mt-3 text-xs font-medium text-muted-foreground">{label}</p>
    </div>
  );
}

const statToneStyles: Record<StatTone, string> = {
  default: "bg-accent text-primary",
  success: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/45 dark:text-emerald-300",
  warning: "bg-amber-50 text-amber-700 dark:bg-amber-950/45 dark:text-amber-300",
  info: "bg-sky-50 text-sky-700 dark:bg-sky-950/45 dark:text-sky-300",
};

function OnboardingChecklist({
  completedCount,
  items,
}: {
  completedCount: number;
  items: ChecklistItem[];
}) {
  const currentIndex = items.findIndex((item) => !item.completed);

  return (
    <WorkspacePanel
      title="Checklist de onboarding"
      description="Completa estos pasos para configurar tu flujo de trabajo."
    >
      <div className="flex items-center justify-between border-b px-4 py-3">
        <span className="text-sm text-muted-foreground">Progreso</span>
        <Badge variant="outline">
          {completedCount}/{items.length}
        </Badge>
      </div>
      <div className="p-4">
        <div className="relative space-y-3 before:absolute before:bottom-5 before:left-4 before:top-5 before:w-px before:bg-border">
          {items.map((item, index) => {
            const isCurrent = index === currentIndex;

            return (
              <Link
                key={item.id}
                className={cn(
                  "relative flex items-start gap-3 rounded-2xl p-2 transition-colors hover:bg-secondary/50",
                  isCurrent && "bg-accent/55",
                )}
                href={item.href}
              >
                <div
                  className={cn(
                    "z-10 flex size-8 shrink-0 items-center justify-center rounded-full border bg-card",
                    item.completed && "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/45 dark:text-emerald-300",
                    isCurrent && !item.completed && "border-primary/25 bg-accent text-primary",
                  )}
                >
                  {item.completed ? <CheckCircle2Icon className="size-4" /> : item.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm font-semibold", item.completed && "text-muted-foreground line-through")}>
                    {item.label}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </WorkspacePanel>
  );
}

function DashboardEmptyState() {
  return (
    <section className="rounded-2xl border bg-card p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-primary">
            <PlusIcon className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-normal">Empieza creando tu primer cliente</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Cuando tengas clientes y planes asignados, aqui veras quien necesita seguimiento.
            </p>
          </div>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/clients">
            <PlusIcon className="size-4" />
            Crear cliente
          </Link>
        </Button>
      </div>
    </section>
  );
}

function DashboardErrorState({
  actionLabel,
  description,
  onRetry,
  title,
}: {
  actionLabel: string;
  description: string;
  onRetry: () => void;
  title: string;
}) {
  return (
    <div className="p-4 sm:p-6">
      <div className="flex min-h-96 flex-col items-center justify-center gap-4 rounded-2xl border border-destructive/25 bg-destructive/5 p-8 text-center text-destructive">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-destructive/10">
          <AlertTriangleIcon className="size-5" />
        </div>
        <div>
          <p className="font-semibold">{title}</p>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
        </div>
        <Button onClick={onRetry} variant="outline">
          {actionLabel}
        </Button>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <WorkspaceSplit
      mainClassName="border-r-0"
      sideClassName="xl:w-[360px] xl:min-w-[340px] xl:max-w-[480px]"
      main={
        <div className="flex flex-col gap-5 bg-background p-4 sm:p-6">
          <DashboardMetricGridSkeleton />
          <WorkspacePanel>
            <div className="border-b px-4 py-4">
              <div className="h-4 w-44 animate-pulse rounded-md bg-muted" />
              <div className="mt-2 h-3 w-72 max-w-full animate-pulse rounded-md bg-muted" />
            </div>
            <div className="p-4">
              <ListRowsSkeleton rows={4} />
            </div>
          </WorkspacePanel>
          <PanelSkeleton rows={1} titleWidth="w-48" />
          <div className="grid gap-3 sm:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-2xl border bg-card p-4">
                <div className="size-10 animate-pulse rounded-xl bg-muted" />
                <div className="min-w-0 flex-1">
                  <div className="h-4 w-24 animate-pulse rounded-md bg-muted" />
                  <div className="mt-2 h-3 w-32 animate-pulse rounded-md bg-muted" />
                </div>
              </div>
            ))}
          </div>
        </div>
      }
      side={
        <div className="space-y-5 p-4 xl:pl-3 xl:pr-5">
          <PanelSkeleton rows={2} titleWidth="w-40" />
          <PanelSkeleton rows={5} titleWidth="w-48" />
        </div>
      }
    />
  );
}

function DashboardMetricGridSkeleton() {
  return (
    <section className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="rounded-2xl border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="size-10 animate-pulse rounded-xl bg-muted" />
            <div className="h-5 w-24 animate-pulse rounded-full bg-muted" />
          </div>
          <div className="mt-5 h-9 w-16 animate-pulse rounded-md bg-muted" />
          <div className="mt-2 h-4 w-32 animate-pulse rounded-md bg-muted" />
        </div>
      ))}
    </section>
  );
}

function formatDisplayDate(value: string) {
  const date = value.length === 10
    ? new Date(`${value}T00:00:00.000Z`)
    : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  }).format(date);
}
