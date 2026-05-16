"use client";

import {
  CheckCircle2Icon,
  CircleIcon,
  DumbbellIcon,
  LayoutDashboardIcon,
  LinkIcon,
  Loader2Icon,
  PlusIcon,
  SearchIcon,
  SmartphoneIcon,
  UserRoundIcon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useDashboard } from "@/hooks/use-dashboard";

type ChecklistItem = {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  href: string;
  icon: React.ReactNode;
};

const navItems = [
  { label: "Dashboard", href: "/", icon: <LayoutDashboardIcon className="size-4" /> },
  { label: "Clientes", href: "/clients", icon: <UsersIcon className="size-4" /> },
  { label: "Planes", href: "/training-plans", icon: <DumbbellIcon className="size-4" /> },
  { label: "Portal", href: "#", icon: <SmartphoneIcon className="size-4" />, disabled: true },
];

function ApiConfigPrompt({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex min-h-96 flex-col items-center justify-center gap-4 rounded-xl border bg-card p-8 text-center">
      <SearchIcon className="size-8 text-muted-foreground" />
      <div>
        <p className="font-medium">Configuracion requerida</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Abre el panel de conexion en Clientes y guarda tu bearer token y organization ID.
        </p>
      </div>
      <Button onClick={onRetry} variant="outline">
        Reintentar
      </Button>
    </div>
  );
}

export function DashboardWorkspace() {
  const { error, isApiReady, isLoading, refresh, stats } = useDashboard();
  const [activeNav] = useState("Dashboard");

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
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-[1240px] flex-col gap-4 p-4 lg:p-6">
        {/* Header */}
        <header className="flex flex-col gap-4 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-primary">
              <LayoutDashboardIcon />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Bienvenido a CoraFit</p>
              <h1 className="text-3xl font-semibold leading-tight">Dashboard</h1>
            </div>
          </div>
          <ThemeToggle />
        </header>

        {/* Navigation */}
        <nav className="flex gap-2 overflow-x-auto">
          {navItems.map((item) => (
            <Link
              key={item.label}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                item.disabled
                  ? "pointer-events-none text-muted-foreground/50"
                  : activeNav === item.label
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80"
              }`}
              href={item.href}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>

        {isLoading ? (
          <div className="flex min-h-96 flex-col items-center justify-center gap-3">
            <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Cargando dashboard...</p>
          </div>
        ) : error && !isApiReady ? (
          <ApiConfigPrompt onRetry={refresh} />
        ) : error ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            {error}
            <Button className="mt-2" onClick={refresh} size="sm" variant="outline">
              Reintentar
            </Button>
          </div>
        ) : stats ? (
          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            {/* Main content */}
            <div className="flex flex-col gap-4">
              {/* Stats cards */}
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Clientes</CardDescription>
                    <CardTitle className="text-3xl">{stats.totalClients}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">
                      {stats.totalClients === 0 ? "Aun no hay clientes registrados." : "Clientes registrados en tu organizacion."}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Planes</CardDescription>
                    <CardTitle className="text-3xl">{stats.totalPlans}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">
                      {stats.totalPlans === 0 ? "Crea o duplica un plan para empezar." : "Templates disponibles."}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Sin plan</CardDescription>
                    <CardTitle className="text-3xl">{stats.clientsWithoutPlan}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">
                      {stats.clientsWithoutPlan === 0
                        ? "Todos tus clientes tienen plan asignado."
                        : "Clientes que necesitan un plan asignado."}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Con acceso</CardDescription>
                    <CardTitle className="text-3xl">{stats.clientsWithAccess}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">
                      {stats.clientsWithAccess === 0
                        ? "Genera accesos para que tus clientes vean su portal."
                        : "Clientes con link y PIN activos."}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* CTA */}
              {nextStep && (
                <Card className="border-primary/30 bg-primary/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Siguiente paso</CardTitle>
                    <CardDescription>
                      {nextStep.label} — {nextStep.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button asChild>
                      <Link href={nextStep.href}>
                        <PlusIcon className="mr-2 size-4" />
                        {nextStep.label}
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Quick links */}
              <div className="grid gap-3 sm:grid-cols-3">
                <Link
                  className="flex items-center gap-3 rounded-lg border bg-background p-4 transition-colors hover:bg-muted/50"
                  href="/clients"
                >
                  <div className="flex size-9 items-center justify-center rounded-md bg-muted">
                    <UsersIcon className="size-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Clientes</p>
                    <p className="text-xs text-muted-foreground">Ver y gestionar clientes</p>
                  </div>
                </Link>
                <Link
                  className="flex items-center gap-3 rounded-lg border bg-background p-4 transition-colors hover:bg-muted/50"
                  href="/training-plans"
                >
                  <div className="flex size-9 items-center justify-center rounded-md bg-muted">
                    <DumbbellIcon className="size-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Planes</p>
                    <p className="text-xs text-muted-foreground">Crear y editar planes</p>
                  </div>
                </Link>
                <Link
                  className="flex items-center gap-3 rounded-lg border bg-background p-4 transition-colors hover:bg-muted/50"
                  href="/clients"
                >
                  <div className="flex size-9 items-center justify-center rounded-md bg-muted">
                    <CheckCircle2Icon className="size-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Asignar plan</p>
                    <p className="text-xs text-muted-foreground">Vincular plan a cliente</p>
                  </div>
                </Link>
              </div>
            </div>

            {/* Sidebar: Checklist */}
            <div className="flex flex-col gap-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Checklist de onboarding</CardTitle>
                    <Badge variant="outline">
                      {completedCount}/{checklist.length}
                    </Badge>
                  </div>
                  <CardDescription>
                    Completa estos pasos para configurar tu flujo de trabajo.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {checklist.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
                        item.completed ? "bg-muted/50 opacity-70" : "bg-background"
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {item.completed ? (
                          <CheckCircle2Icon className="size-5 text-primary" />
                        ) : (
                          <CircleIcon className="size-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-medium ${item.completed ? "line-through" : ""}`}>
                          {item.label}
                        </p>
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                        {!item.completed && (
                          <Link
                            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                            href={item.href}
                          >
                            Ir <PlusIcon className="size-3" />
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
