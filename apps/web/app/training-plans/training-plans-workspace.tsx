"use client";

import {
  ArrowRightIcon,
  CalendarDaysIcon,
  CheckCircle2Icon,
  CopyIcon,
  DumbbellIcon,
  FilePenLineIcon,
  Layers3Icon,
  Loader2Icon,
  PlusIcon,
  SearchIcon,
  SlidersHorizontalIcon,
  TargetIcon,
  UserRoundIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { notify } from "@/lib/notify";
import { useAuth } from "@/components/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WorkspaceFrame, WorkspaceHeader } from "@/components/layout/workspace-shell";
import { ListRowsSkeleton } from "@/components/shared/skeletons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  getErrorMessage as getClientErrorMessage,
  initials,
} from "@/lib/clients/api";
import type {
  Client,
  ClientsResponse,
  CurrentPlanAssignment,
} from "@/lib/clients/types";
import { authenticatedRequest } from "@/lib/api/authenticated-request";
import {
  type TrainingPlanStatus,
  useTrainingPlans,
} from "@/hooks/use-training-plans";

const statusLabels: Record<TrainingPlanStatus, string> = {
  active: "Activo",
  archived: "Archivado",
  draft: "Draft",
};

const levelLabels: Record<string, string> = {
  advanced: "Avanzado",
  beginner: "Principiante",
  intermediate: "Intermedio",
};

type SourceFilter = "all" | "system" | "mine";

const sourceFilters: Array<{
  label: string;
  value: SourceFilter;
}> = [
  { label: "Todos", value: "all" },
  { label: "Sistema", value: "system" },
  { label: "Tus planes", value: "mine" },
];

export function TrainingPlansWorkspace() {
  const router = useRouter();
  const { profile, session, status: authStatus } = useAuth();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [status, setStatus] = useState<TrainingPlanStatus | "all">("all");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [clientQuery, setClientQuery] = useState("");
  const [unassignedClients, setUnassignedClients] = useState<Client[]>([]);
  const [clientsError, setClientsError] = useState("");
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [newPlanName, setNewPlanName] = useState("");
  const [newPlanWeeks, setNewPlanWeeks] = useState("4");
  const [isCreating, setIsCreating] = useState(false);
  const organizationId = profile?.organization?.id ?? null;
  const isApiReady = authStatus === "authenticated" && Boolean(session && organizationId);

  const request = useCallback(
    <T,>(path: string, init: RequestInit = {}) =>
      authenticatedRequest<T>(path, init, { organizationId, session }),
    [organizationId, session],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  const filters = useMemo(
    () => ({ search: debouncedQuery, status }),
    [debouncedQuery, status],
  );
  const { createPlan, error, isLoading, items, refresh, total } =
    useTrainingPlans(filters);
  const hasPlansLoaded = items.length > 0 || total > 0;
  const isInitialPlansLoading = isLoading && !hasPlansLoaded;
  const isRefreshingPlans = isLoading && hasPlansLoaded;
  const visibleItems = useMemo(
    () =>
      items.filter((plan) => {
        if (sourceFilter === "system") {
          return Boolean(plan.isSystemTemplate);
        }

        if (sourceFilter === "mine") {
          return !plan.isSystemTemplate;
        }

        return true;
      }),
    [items, sourceFilter],
  );
  const visibleTotal =
    sourceFilter === "all" ? total : visibleItems.length;

  useEffect(() => {
    if (!isRefreshingPlans) {
      notify.dismiss("training-plans-refresh");
      return;
    }

    const timer = window.setTimeout(() => {
      notify.refresh("Actualizando planes", { id: "training-plans-refresh" });
    }, 500);

    return () => {
      window.clearTimeout(timer);
      notify.dismiss("training-plans-refresh");
    };
  }, [isRefreshingPlans]);

  const filteredUnassignedClients = useMemo(() => {
    const normalizedQuery = clientQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return unassignedClients;
    }

    return unassignedClients.filter((client) =>
      [client.name, client.phone, client.mainGoal]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedQuery)),
    );
  }, [clientQuery, unassignedClients]);

  async function loadUnassignedClients() {
    if (!isApiReady) {
      setUnassignedClients([]);
      setClientsError(
        authStatus === "loading"
          ? ""
          : "Inicia sesión y selecciona una organización para leer clientes.",
      );
      return;
    }

    setIsLoadingClients(true);
    setClientsError("");
    try {
      const response = await request<ClientsResponse>(
        "/clients?page=1&limit=50",
        { method: "GET" },
      );
      const clients = response.items.map((client) => ({
        ...client,
        access: { status: "none" as const },
      }));
      const clientsWithAssignments = await Promise.all(
        clients.map(async (client) => {
          const assignment = await request<CurrentPlanAssignment | null>(
            `/clients/${client.id}/plan-assignment/current`,
            { method: "GET" },
          ).catch(() => null);

          return { assignment, client };
        }),
      );

      setUnassignedClients(
        clientsWithAssignments
          .filter(({ assignment }) => !assignment?.assignedPlan)
          .map(({ client }) => client),
      );
    } catch (caughtError) {
      setClientsError(getClientErrorMessage(caughtError));
      setUnassignedClients([]);
    } finally {
      setIsLoadingClients(false);
    }
  }

  function openAssignDialog() {
    setIsAssignOpen(true);
    setClientQuery("");
    void loadUnassignedClients();
  }

  function navigateToAssignPlan(clientId: string) {
    setIsAssignOpen(false);
    router.push(`/clients/${clientId}/plan-assignment`);
  }

  return (
    <WorkspaceFrame
      header={
        <WorkspaceHeader
          description="Encuentra, compara y edita rutinas antes de asignarlas a tus clientes."
          title="Planes de entrenamiento"
          actions={
            <>
              <Button size="sm" type="button" variant="outline" onClick={openAssignDialog}>
                <UserRoundIcon data-icon="inline-start" />
                Asignar plan
              </Button>
              <Button size="sm" type="button" onClick={() => setIsCreateOpen(true)}>
                <PlusIcon data-icon="inline-start" />
                Nuevo plan
              </Button>
            </>
          }
        />
      }
    >
      <section className="flex flex-col gap-3 border-b bg-background p-4 shadow-none md:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge variant="muted">
                {`${visibleTotal} planes`}
              </Badge>
            </div>
          </div>

          <div />
        </div>

        <div className="grid gap-2 xl:grid-cols-[1fr_auto_auto] xl:items-center">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-9 pl-10"
              placeholder="Buscar por nombre, objetivo o notas"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto rounded-md border bg-background p-1">
            <SlidersHorizontalIcon className="ml-2 hidden size-4 shrink-0 text-muted-foreground sm:block" />
            {sourceFilters.map((filter) => (
              <button
                key={filter.value}
                className={[
                  "h-7 shrink-0 rounded px-2.5 text-xs font-semibold transition-colors",
                  sourceFilter === filter.value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                ].join(" ")}
                type="button"
                onClick={() => setSourceFilter(filter.value)}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <label className="flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm text-muted-foreground">
            Estado
            <select
              aria-label="Filtrar por estado"
              className="h-7 rounded-md bg-transparent font-medium text-foreground outline-none"
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as TrainingPlanStatus | "all")
              }
            >
              <option value="all">Todos</option>
              <option value="active">Activos</option>
              <option value="draft">Borradores</option>
              <option value="archived">Archivados</option>
            </select>
          </label>
        </div>
      </section>

      <section className="bg-background p-5">
        {error ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {!error && isInitialPlansLoading ? (
          <ListRowsSkeleton rows={6} />
        ) : !error && visibleItems.length ? (
          <div className="overflow-hidden rounded-md border bg-card">
            {visibleItems.map((plan) => (
              <Link
                key={plan.id}
                className="group grid gap-3 border-b bg-card p-3 transition-colors last:border-b-0 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25 md:grid-cols-[minmax(0,1.5fr)_minmax(14rem,0.9fr)_auto] md:items-center"
                href={`/training-plans/${plan.id}/edit`}
              >
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold leading-5 md:text-base">
                      {plan.name}
                    </p>
                    <PlanStatusBadges
                      isSystemTemplate={Boolean(plan.isSystemTemplate)}
                      status={plan.status}
                    />
                  </div>
                  <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                    {plan.goal || plan.generalNotes || "Sin objetivo registrado."}
                  </p>
                </div>

                <div className="grid gap-2 text-sm sm:grid-cols-2">
                  <PlanMeta
                    icon={CalendarDaysIcon}
                    label="Duracion"
                    value={`${plan.durationWeeks} semanas`}
                  />
                  <PlanMeta
                    icon={TargetIcon}
                    label="Nivel"
                    value={
                      plan.level
                        ? (levelLabels[plan.level] ?? plan.level)
                        : "Sin nivel"
                    }
                  />
                </div>

                <div className="flex items-center justify-between gap-3 md:justify-end">
                  <span className="hidden items-center gap-2 text-xs font-medium text-muted-foreground lg:inline-flex">
                    {plan.isSystemTemplate ? (
                      <>
                        <CopyIcon className="size-4" />
                        Copiar para personalizar
                      </>
                    ) : (
                      <>
                        <FilePenLineIcon className="size-4" />
                        Listo para editar
                      </>
                    )}
                  </span>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
                    Editar
                    <ArrowRightIcon className="size-4" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : !error && !isLoading ? (
          <div className="flex min-h-72 flex-col items-center justify-center gap-4 rounded-md border bg-card p-8 text-center">
            <div className="flex size-11 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <DumbbellIcon />
            </div>
            <div>
              <p className="font-semibold">No hay planes para estos filtros</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Ajusta la busqueda o crea un nuevo plan desde cero.
              </p>
            </div>
            <Button size="sm" type="button" onClick={() => setIsCreateOpen(true)}>
              <PlusIcon data-icon="inline-start" />
              Nuevo plan
            </Button>
          </div>
        ) : null}
      </section>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo plan de entrenamiento</DialogTitle>
            <DialogDescription>
              Crea un plan en borrador para empezar a editarlo.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium" htmlFor="plan-name">
                Nombre
              </label>
              <Input
                id="plan-name"
                placeholder="Ej: Plan de fuerza 4 semanas"
                value={newPlanName}
                onChange={(event) => setNewPlanName(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium" htmlFor="plan-weeks">
                Semanas
              </label>
              <Input
                id="plan-weeks"
                min={1}
                max={52}
                type="number"
                value={newPlanWeeks}
                onChange={(event) => setNewPlanWeeks(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!newPlanName.trim() || isCreating}
              onClick={async () => {
                setIsCreating(true);
                try {
                  const plan = await createPlan({
                    name: newPlanName.trim(),
                    durationWeeks: Number(newPlanWeeks),
                  });
                  notify.success("Plan creado");
                  setIsCreateOpen(false);
                  setNewPlanName("");
                  setNewPlanWeeks("4");
                  void refresh();
                  router.push(`/training-plans/${plan.id}/edit`);
                } catch (caughtError) {
                  notify.error(
                    caughtError instanceof Error
                      ? caughtError.message
                      : "Error al crear plan",
                  );
                } finally {
                  setIsCreating(false);
                }
              }}
            >
              {isCreating ? <Loader2Icon className="mr-2 size-4 animate-spin" /> : null}
              Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Asignar plan</DialogTitle>
            <DialogDescription>
              Elige un cliente sin plan activo para abrir el flujo de asignacion.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-10"
                placeholder="Buscar cliente sin plan..."
                value={clientQuery}
                onChange={(event) => setClientQuery(event.target.value)}
              />
            </div>

            {clientsError ? (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                {clientsError}
              </div>
            ) : null}

            {isLoadingClients ? (
              <div className="flex min-h-40 items-center justify-center rounded-lg border bg-background text-sm text-muted-foreground">
                <Loader2Icon className="mr-2 size-4 animate-spin" />
                Cargando clientes
              </div>
            ) : filteredUnassignedClients.length ? (
              <div className="max-h-80 overflow-y-auto rounded-lg border">
                {filteredUnassignedClients.map((client) => (
                  <button
                    key={client.id}
                    className="flex w-full items-center justify-between gap-3 border-b bg-background p-3 text-left transition-colors last:border-b-0 hover:bg-muted/60"
                    type="button"
                    onClick={() => navigateToAssignPlan(client.id)}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-primary">
                        {initials(client.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{client.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {client.phone || client.mainGoal || "Sin telefono"}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">Sin plan</Badge>
                  </button>
                ))}
              </div>
            ) : !clientsError ? (
              <div className="flex min-h-40 flex-col items-center justify-center rounded-lg border bg-background p-6 text-center">
                <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <UserRoundIcon className="size-5" />
                </div>
                <p className="mt-3 font-semibold">
                  Todos los clientes tienen plan asignado
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  No hay clientes disponibles para iniciar una nueva asignacion.
                </p>
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </WorkspaceFrame>
  );
}

function PlanStatusBadges({
  isSystemTemplate,
  status,
}: {
  isSystemTemplate: boolean;
  status: TrainingPlanStatus;
}) {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-1.5">
      {isSystemTemplate ? (
        <Badge className="border-primary/25 bg-primary/10 text-primary">
          <Layers3Icon className="mr-1 size-3" />
          Sistema
        </Badge>
      ) : null}
      <Badge
        className={
          status === "active"
            ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
            : status === "draft"
              ? "border-amber-400/25 bg-amber-400/10 text-amber-200"
              : "border-muted bg-muted text-muted-foreground"
        }
        variant="outline"
      >
        {status === "active" ? <CheckCircle2Icon className="mr-1 size-3" /> : null}
        {statusLabels[status]}
      </Badge>
    </div>
  );
}

function PlanMeta({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border bg-background px-2.5 py-1.5">
      <div className="flex size-7 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}
