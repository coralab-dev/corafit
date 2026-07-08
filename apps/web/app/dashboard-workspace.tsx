"use client";

import {
  AlertTriangleIcon,
  CalendarCheckIcon,
  CheckCircle2Icon,
  CircleIcon,
  DumbbellIcon,
  LinkIcon,
  PlusIcon,
  SmartphoneIcon,
  UserRoundIcon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  WorkspaceFrame,
  WorkspaceHeader,
  WorkspacePanel,
  WorkspaceSplit,
} from "@/components/layout/workspace-shell";
import { MetricStrip } from "@/components/shared/metric-strip";
import { ListRowsSkeleton, MetricStripSkeleton, PanelSkeleton } from "@/components/shared/skeletons";
import { useDashboard } from "@/hooks/use-dashboard";
import type { DashboardAttentionItem } from "@/hooks/use-dashboard";
import { notify } from "@/lib/notify";

type ChecklistItem = {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  href: string;
  icon: React.ReactNode;
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

  const checklist: ChecklistItem[] = stats
    ? [
        {
          id: "create-client",
          label: "Crear tu primer cliente",
          description: "Registra al menos un cliente en tu organizacion.",
          completed: stats.onboarding.checklist.hasCreatedClient,
          href: "/clients",
          icon: <UserRoundIcon className="size-4" />,
        },
        {
          id: "select-plan",
          label: "Crear o elegir un plan",
          description: "Crea un plan desde cero o duplica uno base del sistema.",
          completed: stats.onboarding.checklist.hasCreatedOrSelectedPlan,
          href: "/training-plans",
          icon: <DumbbellIcon className="size-4" />,
        },
        {
          id: "assign-plan",
          label: "Asignar plan a un cliente",
          description: "Vincula un plan de entrenamiento a un cliente.",
          completed: stats.onboarding.checklist.hasAssignedPlan,
          href: "/clients",
          icon: <CheckCircle2Icon className="size-4" />,
        },
        {
          id: "generate-access",
          label: "Generar acceso al portal",
          description: "Crea un link y PIN para que tu cliente entre a su portal.",
          completed: stats.onboarding.checklist.hasGeneratedAccess,
          href: "/clients",
          icon: <LinkIcon className="size-4" />,
        },
        {
          id: "preview-portal",
          label: "Ver portal como cliente",
          description: "Abre el portal con el link generado para validar la experiencia.",
          completed: stats.onboarding.checklist.hasPreviewedPortal,
          href: "/clients",
          icon: <SmartphoneIcon className="size-4" />,
        },
      ]
    : [];

  const completedCount = checklist.filter((item) => item.completed).length;
  const nextStep = checklist.find((item) => !item.completed);

  return (
    <WorkspaceFrame
      header={
        <WorkspaceHeader
          description="Detecta clientes que necesitan seguimiento y revisa tu operación semanal."
          title="Dashboard"
          actions={
            <Button asChild className="shadow-none">
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
        <div className="flex min-h-96 flex-col items-center justify-center gap-4 p-8 text-center">
          <div>
            <p className="font-medium">Inicia sesión para ver tu dashboard.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Necesitamos una sesión activa para cargar tu operación.
            </p>
          </div>
          <Button onClick={refresh} variant="outline">
            Reintentar
          </Button>
        </div>
      ) : error && !stats ? (
        <div className="m-6 rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          No pudimos cargar el dashboard.
          <Button className="mt-2" onClick={refresh} size="sm" variant="outline">
            Reintentar
          </Button>
        </div>
      ) : stats ? (
        <WorkspaceSplit
          main={
            <div className="flex flex-col gap-5 bg-background p-6">
              {error ? (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                  {error}
                </div>
              ) : null}
              <MetricStrip
                items={[
                  {
                    helper:
                      stats.summary.activeClients === 0
                        ? "Sin clientes activos."
                        : "En seguimiento.",
                    icon: <UsersIcon className="size-4" />,
                    label: "Clientes activos",
                    value: stats.summary.activeClients,
                  },
                  {
                    helper:
                      stats.summary.clientsWithoutPlan === 0
                        ? "Todos iniciados."
                        : "Nunca tuvieron plan.",
                    icon: <CheckCircle2Icon className="size-4" />,
                    label: "Sin plan inicial",
                    tone: "amber",
                    value: stats.summary.clientsWithoutPlan,
                  },
                  {
                    helper:
                      stats.summary.clientsAtRisk === 0
                        ? "Sin alertas."
                        : "Requieren revisión.",
                    icon: <AlertTriangleIcon className="size-4" />,
                    label: "En riesgo",
                    tone: "amber",
                    value: stats.summary.clientsAtRisk,
                  },
                  {
                    helper:
                      stats.summary.clientsWithoutActivity === 0
                        ? "Sin detenidos."
                        : "14 días sin completar.",
                    icon: <CircleIcon className="size-4" />,
                    label: "Sin actividad",
                    tone: "amber",
                    value: stats.summary.clientsWithoutActivity,
                  },
                ]}
              />

              {stats.summary.activeClients === 0 && onboarding?.totalClients === 0 ? (
                <WorkspacePanel title="Empieza creando tu primer cliente">
                  <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="max-w-xl text-sm text-muted-foreground">
                      Cuando tengas clientes y planes asignados, aquí verás quién necesita seguimiento.
                    </p>
                    <Button asChild className="shadow-none">
                      <Link href="/clients">
                        <PlusIcon className="size-4" />
                        Crear cliente
                      </Link>
                    </Button>
                  </div>
                </WorkspacePanel>
              ) : null}

              <WorkspacePanel title="Sesiones completadas esta semana">
                <div className="flex items-center gap-3 p-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <CalendarCheckIcon className="size-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold tracking-tight">
                      {stats.summary.sessionsCompletedThisWeek}
                    </p>
                    <p className="text-sm text-muted-foreground">Esta semana.</p>
                  </div>
                </div>
              </WorkspacePanel>

              <WorkspacePanel
                title="Requieren seguimiento"
                description="Incluye planes finalizados, pausas de actividad y clientes sin plan inicial."
              >
                {stats.attention.length > 0 ? (
                  <div className="divide-y">
                    {stats.attention.map((item) => (
                      <AttentionRow key={item.clientId} item={item} />
                    ))}
                  </div>
                ) : (
                  <div className="p-5">
                    <p className="font-medium">Todo en orden por ahora.</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      No hay clientes que requieran seguimiento inmediato.
                    </p>
                  </div>
                )}
              </WorkspacePanel>

              {nextStep ? (
                <WorkspacePanel title="Siguiente paso" description={nextStep.description}>
                  <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                        {nextStep.icon}
                      </div>
                      <p className="text-sm font-semibold">{nextStep.label}</p>
                    </div>
                    <Button asChild className="shadow-none">
                      <Link href={nextStep.href}>
                        <PlusIcon className="size-4" />
                        Continuar
                      </Link>
                    </Button>
                  </div>
                </WorkspacePanel>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-3">
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
              </div>
            </div>
          }
          side={
            <div className="p-5">
              {onboarding ? (
                <WorkspacePanel
                  title="Configuración inicial"
                  description="Conteo general; sin plan activo incluye planes finalizados."
                >
                  <div className="grid grid-cols-2 gap-3 p-4 text-sm">
                    <SmallStat label="Clientes" value={onboarding.totalClients} />
                    <SmallStat label="Planes" value={onboarding.totalPlans} />
                    <SmallStat label="Sin plan activo" value={onboarding.clientsWithoutPlan} />
                    <SmallStat label="Con acceso" value={onboarding.clientsWithAccess} />
                  </div>
                </WorkspacePanel>
              ) : null}

              <WorkspacePanel
                className="mt-5"
                title="Checklist de onboarding"
                description="Completa estos pasos para configurar tu flujo de trabajo."
              >
                <div className="flex items-center justify-between border-b px-4 py-3">
                  <span className="text-sm text-muted-foreground">Progreso</span>
                  <Badge variant="outline">
                    {completedCount}/{checklist.length}
                  </Badge>
                </div>
                <div className="flex flex-col">
                  {checklist.map((item) => (
                    <Link
                      key={item.id}
                      className="flex items-start gap-3 border-b px-4 py-3 transition-colors last:border-b-0 hover:bg-muted/45"
                      href={item.href}
                    >
                      <div className="mt-0.5 shrink-0">
                        {item.completed ? (
                          <CheckCircle2Icon className="size-5 text-primary" />
                        ) : (
                          <CircleIcon className="size-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={item.completed ? "text-sm font-medium line-through" : "text-sm font-medium"}>
                          {item.label}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </WorkspacePanel>
            </div>
          }
        />
      ) : null}
    </WorkspaceFrame>
  );
}

function DashboardSkeleton() {
  return (
    <WorkspaceSplit
      main={
        <div className="flex flex-col gap-5 bg-background p-6">
          <MetricStripSkeleton />
          <PanelSkeleton rows={1} titleWidth="w-56" />
          <PanelSkeleton rows={1} titleWidth="w-48" />
          <WorkspacePanel>
            <div className="border-b px-4 py-4">
              <div className="h-4 w-44 animate-pulse rounded-md bg-muted" />
              <div className="mt-2 h-3 w-72 max-w-full animate-pulse rounded-md bg-muted" />
            </div>
            <div className="p-4">
              <ListRowsSkeleton rows={4} />
            </div>
          </WorkspacePanel>
          <div className="grid gap-3 sm:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-md border bg-card p-4">
                <div className="size-9 animate-pulse rounded-md bg-muted" />
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
        <div className="p-5">
          <PanelSkeleton rows={2} titleWidth="w-40" />
          <PanelSkeleton className="mt-5" rows={5} titleWidth="w-48" />
        </div>
      }
    />
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
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <Link
      className="flex items-center gap-3 rounded-md border bg-card p-4 transition-colors hover:bg-muted/50"
      href={href}
    >
      <div className="flex size-9 items-center justify-center rounded-md bg-muted text-primary">
        {icon}
      </div>
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </Link>
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
  future_plan: "Su plan todavía no inicia.",
  plan_finished: "Su plan terminó y necesita revisión.",
  without_activity: "No registra sesiones completadas en los últimos 14 días.",
  at_risk: "Tiene sesiones esperadas sin completar esta semana.",
};

function AttentionRow({ item }: { item: DashboardAttentionItem }) {
  return (
    <div className="flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{item.name}</p>
          <Badge className="bg-muted text-[11px] font-semibold uppercase tracking-normal" variant="outline">
            {attentionLabels[item.status]}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {attentionReasons[item.status] ?? item.reason}
        </p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {item.currentPlan ? (
            <span>Plan: {item.currentPlan.name}</span>
          ) : null}
          {item.lastCompletedSessionAt ? (
            <span>Última sesión: {formatDisplayDate(item.lastCompletedSessionAt)}</span>
          ) : null}
          {item.nextExpectedSessionDate ? (
            <span>Próxima esperada: {formatDisplayDate(item.nextExpectedSessionDate)}</span>
          ) : null}
        </div>
      </div>
      <Button asChild className="w-full shrink-0 shadow-none md:w-auto" size="sm" variant="outline">
        <Link href={`/clients?selected=${item.clientId}`}>Ver cliente</Link>
      </Button>
    </div>
  );
}

function SmallStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tracking-tight">{value}</p>
    </div>
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
