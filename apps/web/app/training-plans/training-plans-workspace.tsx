"use client";

import {
  Loader2Icon,
  PlusIcon,
  SearchIcon,
  UserRoundIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { notify } from "@/lib/notify";
import { useAuth } from "@/components/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrainingPlanLibrary,
  type PlanSourceFilter,
} from "@/components/training-plans/training-plan-library";
import { TrainingPlanMetrics } from "@/components/training-plans/training-plan-metrics";
import { WorkspaceFrame, WorkspaceHeader } from "@/components/layout/workspace-shell";
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
} from "@/lib/clients/types";
import { authenticatedRequest } from "@/lib/api/authenticated-request";
import { fetchAllPages } from "@/lib/pagination";
import {
  getAssignableClientDialogState,
  getClientsAvailableForAssignment,
} from "./assign-plan-state";
import {
  type TrainingPlanStatus,
  useTrainingPlanMetrics,
  useTrainingPlans,
} from "@/hooks/use-training-plans";

export function TrainingPlansWorkspace() {
  const router = useRouter();
  const { profile, session, status: authStatus } = useAuth();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [status, setStatus] = useState<TrainingPlanStatus | "all">("all");
  const [sourceFilter, setSourceFilter] = useState<PlanSourceFilter>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [clientQuery, setClientQuery] = useState("");
  const [assignmentClients, setAssignmentClients] = useState<Client[]>([]);
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
  const { isLoading: isMetricsLoading, metrics, refresh: refreshMetrics } =
    useTrainingPlanMetrics();
  const isRefreshingPlans = isLoading && (items.length > 0 || total > 0);
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
  const assignDialogState = getAssignableClientDialogState(
    assignmentClients,
    clientsError,
    isLoadingClients,
  );

  async function loadUnassignedClients() {
    if (!isApiReady) {
      setAssignmentClients([]);
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
      const clients = (await fetchAllPages({
        fetchPage: (pageParams) =>
          request<ClientsResponse>(
            `/clients?${pageParams.toString()}`,
            { method: "GET" },
          ),
      })).map((client) => ({
        ...client,
        access: { status: "none" as const },
      }));
      setAssignmentClients(clients);
      setUnassignedClients(getClientsAvailableForAssignment(clients));
    } catch (caughtError) {
      setClientsError(getClientErrorMessage(caughtError));
      setAssignmentClients([]);
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
          description="Diseña, organiza y publica rutinas reutilizables para tus clientes."
          title="Planes de entrenamiento"
          actions={
            <>
              <Button size="sm" type="button" variant="outline" onClick={openAssignDialog}>
                <UserRoundIcon data-icon="inline-start" />
                Asignar a cliente
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
      <section className="flex flex-col gap-5 bg-background p-4 md:p-5">
        <TrainingPlanMetrics isLoading={isMetricsLoading} metrics={metrics} />
        <TrainingPlanLibrary
          error={error}
          isLoading={isLoading}
          items={visibleItems}
          onCreatePlan={() => setIsCreateOpen(true)}
          onQueryChange={setQuery}
          onSourceFilterChange={setSourceFilter}
          onStatusChange={setStatus}
          query={query}
          resultCount={visibleTotal}
          sourceFilter={sourceFilter}
          status={status}
          total={total}
        />
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
                  void refreshMetrics();
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

            {assignDialogState === "error" ? (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                {clientsError}
              </div>
            ) : null}

            {assignDialogState === "loading" ? (
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
            ) : assignDialogState === "empty" ? (
              <div className="flex min-h-40 flex-col items-center justify-center rounded-lg border bg-background p-6 text-center">
                <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <UserRoundIcon className="size-5" />
                </div>
                <p className="mt-3 font-semibold">
                  No existen clientes
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Crea un cliente antes de iniciar una asignacion.
                </p>
              </div>
            ) : assignDialogState === "all-assigned" ? (
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
