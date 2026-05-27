"use client";

import {
  CheckCircle2Icon,
  CircleIcon,
  DumbbellIcon,
  LinkIcon,
  Loader2Icon,
  PlusIcon,
  SmartphoneIcon,
  UserRoundIcon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  WorkspaceFrame,
  WorkspaceHeader,
  WorkspacePanel,
  WorkspaceSplit,
} from "@/components/layout/workspace-shell";
import { MetricStrip } from "@/components/shared/metric-strip";
import { useDashboard } from "@/hooks/use-dashboard";

type ChecklistItem = {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  href: string;
  icon: React.ReactNode;
};

export function DashboardWorkspace() {
  const { error, isApiReady, isLoading, refresh, stats } = useDashboard();

  const checklist: ChecklistItem[] = stats
    ? [
        {
          id: "create-client",
          label: "Crear tu primer cliente",
          description: "Registra al menos un cliente en tu organizacion.",
          completed: stats.checklist.hasCreatedClient,
          href: "/clients",
          icon: <UserRoundIcon className="size-4" />,
        },
        {
          id: "select-plan",
          label: "Crear o elegir un plan",
          description: "Crea un plan desde cero o duplica uno base del sistema.",
          completed: stats.checklist.hasCreatedOrSelectedPlan,
          href: "/training-plans",
          icon: <DumbbellIcon className="size-4" />,
        },
        {
          id: "assign-plan",
          label: "Asignar plan a un cliente",
          description: "Vincula un plan de entrenamiento a un cliente.",
          completed: stats.checklist.hasAssignedPlan,
          href: "/clients",
          icon: <CheckCircle2Icon className="size-4" />,
        },
        {
          id: "generate-access",
          label: "Generar acceso al portal",
          description: "Crea un link y PIN para que tu cliente entre a su portal.",
          completed: stats.checklist.hasGeneratedAccess,
          href: "/clients",
          icon: <LinkIcon className="size-4" />,
        },
        {
          id: "preview-portal",
          label: "Ver portal como cliente",
          description: "Abre el portal con el link generado para validar la experiencia.",
          completed: stats.checklist.hasPreviewedPortal,
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
          description="Resumen operativo para configurar y mantener tu workspace."
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
      {isLoading ? (
        <div className="flex min-h-96 flex-col items-center justify-center gap-3">
          <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Cargando dashboard...</p>
        </div>
      ) : error && !isApiReady ? (
        <div className="flex min-h-96 flex-col items-center justify-center gap-4 p-8 text-center">
          <div>
            <p className="font-medium">Configuracion requerida</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Configura la conexion al API para usar el dashboard.
            </p>
          </div>
          <Button onClick={refresh} variant="outline">
            Reintentar
          </Button>
        </div>
      ) : error ? (
        <div className="m-6 rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
          <Button className="mt-2" onClick={refresh} size="sm" variant="outline">
            Reintentar
          </Button>
        </div>
      ) : stats ? (
        <WorkspaceSplit
          main={
            <div className="flex flex-col gap-5 bg-background p-6">
              <MetricStrip
                items={[
                  {
                    helper:
                      stats.totalClients === 0
                        ? "Aun no hay clientes registrados."
                        : "Clientes registrados.",
                    icon: <UsersIcon className="size-4" />,
                    label: "Clientes",
                    value: stats.totalClients,
                  },
                  {
                    helper:
                      stats.totalPlans === 0
                        ? "Crea o duplica un plan para empezar."
                        : "Templates disponibles.",
                    icon: <DumbbellIcon className="size-4" />,
                    label: "Planes",
                    value: stats.totalPlans,
                  },
                  {
                    helper:
                      stats.clientsWithoutPlan === 0
                        ? "Todos tienen plan asignado."
                        : "Necesitan plan asignado.",
                    icon: <CheckCircle2Icon className="size-4" />,
                    label: "Sin plan",
                    tone: "amber",
                    value: stats.clientsWithoutPlan,
                  },
                  {
                    helper:
                      stats.clientsWithAccess === 0
                        ? "Genera accesos al portal."
                        : "Links y PIN activos.",
                    icon: <LinkIcon className="size-4" />,
                    label: "Con acceso",
                    tone: "green",
                    value: stats.clientsWithAccess,
                  },
                ]}
              />

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
              <WorkspacePanel
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
