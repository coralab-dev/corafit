"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { notify } from "@/lib/notify";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { WorkspaceFrame, WorkspaceHeader, WorkspacePanel, WorkspaceSplit } from "@/components/layout/workspace-shell";
import { ClientDetail, ClientFormDialog, ClientList, EndPlanDialog } from "@/components/clients/components";
import { ClientActivityPanel, ClientActivitySkeletonPanel, ClientDetailLoadingCard, ClientErrorCard, ClientMetrics, ClientNotFoundCard } from "@/components/clients/workspace-panels";
import { useAuth } from "@/components/providers/auth-provider";
import { DetailDrawer } from "@/components/shared/detail-drawer";
import { PanelSkeleton } from "@/components/shared/skeletons";
import { authenticatedRequest } from "@/lib/api/authenticated-request";
import { clientSchema, emptyDefaults, getErrorMessage, normalizeFormValues, statusLabels } from "@/lib/clients/api";
import type { ClientFormValues } from "@/lib/clients/api";
import type { Client, ClientsResponse, CurrentPlanAssignment, OperationalStatus } from "@/lib/clients/types";

interface ClientsWorkspaceProps {
  mode?: "list" | "detail";
  selectedClientId?: string;
}

export function ClientsWorkspace({ mode = "list", selectedClientId }: ClientsWorkspaceProps = {}) {
  const { profile, session, status: authStatus } = useAuth();
  const searchParams = useSearchParams();
  const selectedFromQuery = selectedClientId ?? searchParams.get("selected");
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<OperationalStatus | "all">("all");
  const [isListLoading, setIsListLoading] = useState(false);
  const [isSubmittingClient, setIsSubmittingClient] = useState(false);
  const [error, setError] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [assignmentsByClient, setAssignmentsByClient] = useState<
    Record<string, CurrentPlanAssignment | null>
  >({});
  const [assignmentLoadingId, setAssignmentLoadingId] = useState("");
  const [isEndPlanOpen, setIsEndPlanOpen] = useState(false);
  const [isEndingPlan, setIsEndingPlan] = useState(false);
  const [loadedOrganizationId, setLoadedOrganizationId] = useState<string | null>(null);

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    mode: "onSubmit",
    reValidateMode: "onBlur",
    defaultValues: emptyDefaults,
  });

  const organizationId = profile?.organization?.id ?? null;
  const isApiReady = authStatus === "authenticated" && Boolean(session && organizationId);
  const hasLoadedClients = loadedOrganizationId === organizationId;
  const visibleClients = useMemo(
    () => (hasLoadedClients ? allClients : []),
    [allClients, hasLoadedClients],
  );
  const visibleAssignmentsByClient = useMemo(
    () => (hasLoadedClients ? assignmentsByClient : {}),
    [assignmentsByClient, hasLoadedClients],
  );
  const selectedClient = visibleClients.find((client) => client.id === selectedId);
  const selectedAssignment = selectedClient
    ? visibleAssignmentsByClient[selectedClient.id]
    : null;
  const isInitialLoading =
    (authStatus === "loading" && !hasLoadedClients) ||
    (isListLoading && !hasLoadedClients);
  const isRefreshing = isListLoading && hasLoadedClients;

  const clientsRequest = useCallback(
    <T,>(path: string, init: RequestInit = {}) =>
      authenticatedRequest<T>(path, init, { organizationId, session }),
    [organizationId, session],
  );

  const loadCurrentPlanAssignment = useCallback(
    async (clientId: string) => {
      if (!isApiReady) {
        return null;
      }

      const assignment = await clientsRequest<CurrentPlanAssignment | null>(
        `/clients/${clientId}/plan-assignment/current`,
        { method: "GET" },
      );

      setAssignmentsByClient((current) => ({
        ...current,
        [clientId]: assignment,
      }));

      return assignment;
    },
    [clientsRequest, isApiReady],
  );

  const loadClients = useCallback(async () => {
    if (!isApiReady) {
      if (authStatus !== "loading") {
        setAllClients([]);
        setAssignmentsByClient({});
        setSelectedId("");
        setLoadedOrganizationId(null);
      }
      setError(authStatus === "loading" ? "" : "Inicia sesión para leer tus clientes.");
      return;
    }

    setIsListLoading(true);
    setError("");
    try {
      const searchParams = new URLSearchParams({
        page: "1",
        limit: "50",
      });

      const response = await clientsRequest<ClientsResponse>(
        `/clients?${searchParams.toString()}`,
        { method: "GET" },
      );
      const nextClients = response.items.map((client) => ({
        ...client,
        access: client.access ?? { status: "none" as const },
      }));
      const nextAssignments = Object.fromEntries(
        nextClients.map((client) => [client.id, client.currentAssignment ?? null]),
      );

      setAllClients(nextClients);
      setAssignmentsByClient(nextAssignments);
      setLoadedOrganizationId(organizationId);
      setSelectedId((current) => {
        if (selectedFromQuery && nextClients.some((client) => client.id === selectedFromQuery)) {
          return selectedFromQuery;
        }
        if (nextClients.some((client) => client.id === current)) {
          return current;
        }

        return nextClients[0]?.id ?? "";
      });
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setIsListLoading(false);
    }
  }, [authStatus, clientsRequest, isApiReady, organizationId, selectedFromQuery]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadClients();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadClients]);

  useEffect(() => {
    if (!isRefreshing) {
      notify.dismiss("clients-refresh");
      return;
    }

    const timer = window.setTimeout(() => {
      notify.refresh("Actualizando clientes", { id: "clients-refresh" });
    }, 500);

    return () => {
      window.clearTimeout(timer);
      notify.dismiss("clients-refresh");
    };
  }, [isRefreshing]);

  useEffect(() => {
    if (!selectedId || !isApiReady) {
      return;
    }

    const timer = window.setTimeout(() => {
      setAssignmentLoadingId(selectedId);
      void loadCurrentPlanAssignment(selectedId).catch((caughtError) => {
        setAssignmentsByClient((current) => ({
          ...current,
          [selectedId]: null,
        }));
        setError(getErrorMessage(caughtError));
      }).finally(() => {
        setAssignmentLoadingId((current) => (current === selectedId ? "" : current));
      });
    }, 0);

    return () => window.clearTimeout(timer);
  }, [isApiReady, loadCurrentPlanAssignment, selectedId]);

  const displayClients = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return visibleClients.filter((client) => {
      const matchesStatus =
        statusFilter === "all" || client.operationalStatus === statusFilter;
      const matchesQuery =
        !normalizedQuery ||
        client.name.toLowerCase().includes(normalizedQuery) ||
        client.phone.toLowerCase().includes(normalizedQuery) ||
        client.mainGoal.toLowerCase().includes(normalizedQuery);

      return matchesStatus && matchesQuery;
    });
  }, [query, statusFilter, visibleClients]);

  const activeCount = visibleClients.filter(
    (client) => client.operationalStatus === "active",
  ).length;
  const pausedInactiveCount = visibleClients.filter(
    (client) =>
      client.operationalStatus === "paused" ||
      client.operationalStatus === "inactive",
  ).length;
  const assignmentCount = Object.values(visibleAssignmentsByClient).filter(Boolean).length;
  const accessCount = visibleClients.filter((client) => client.access.status === "active").length;

  function openCreateForm() {
    setEditingClient(null);
    form.reset(emptyDefaults);
    setIsFormOpen(true);
  }

  function openEditForm(client: Client) {
    setEditingClient(client);
    form.reset({
      name: client.name,
      phone: client.phone,
      age: client.age,
      sex: client.sex,
      clientType: client.clientType,
      mainGoal: client.mainGoal,
      heightCm: client.heightCm,
      initialWeightKg: client.initialWeightKg,
      trainingLevel: client.trainingLevel,
      injuriesNotes: client.injuriesNotes,
      generalNotes: client.generalNotes,
      canRegisterWeight: client.canRegisterWeight,
    });
    setIsFormOpen(true);
  }

  async function submitClient(values: ClientFormValues) {
    setIsSubmittingClient(true);
    setError("");

    try {
      const payload = normalizeFormValues(values);

      if (editingClient) {
        const updatedClient = await clientsRequest<Omit<Client, "access" | "currentAssignment">>(
          `/clients/${editingClient.id}`,
          { method: "PATCH", body: JSON.stringify(payload) },
        );
        setAllClients((current) =>
          current.map((client) =>
            client.id === editingClient.id
              ? { ...updatedClient, access: client.access, currentAssignment: client.currentAssignment }
              : client,
          ),
        );
        notify.success("Cliente actualizado");
      } else {
        const createdClient = await clientsRequest<Omit<Client, "access" | "currentAssignment">>(
          "/clients",
          { method: "POST", body: JSON.stringify(payload) },
        );
        setAllClients((current) => [
          { ...createdClient, access: { status: "none" }, currentAssignment: null },
          ...current,
        ]);
        setAssignmentsByClient((current) => ({ ...current, [createdClient.id]: null }));
        setSelectedId(createdClient.id);
        notify.success("Cliente creado");
      }

      setIsFormOpen(false);
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setIsSubmittingClient(false);
    }
  }

  async function updateStatus(clientId: string, status: OperationalStatus) {
    setError("");
    try {
      const updatedClient = await clientsRequest<Omit<Client, "access" | "currentAssignment">>(
        `/clients/${clientId}/status`,
        { method: "PATCH", body: JSON.stringify({ status }) },
      );
      setAllClients((current) =>
        current.map((client) =>
          client.id === clientId
            ? { ...updatedClient, access: client.access, currentAssignment: client.currentAssignment }
            : client,
        ),
      );
      notify.success(`Cliente ${statusLabels[status].toLowerCase()}`);
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    }
  }

  async function endCurrentPlanForSelectedClient() {
    if (!selectedClient) {
      return;
    }

    setIsEndingPlan(true);
    setError("");
    try {
      await clientsRequest(
        `/clients/${selectedClient.id}/plan-assignment/current/end`,
        { method: "POST" },
      );
      await loadCurrentPlanAssignment(selectedClient.id);
      setIsEndPlanOpen(false);
      notify.success("Plan finalizado");
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setIsEndingPlan(false);
    }
  }

  const sharedDialogs = (
    <>
      <ClientFormDialog
        form={form}
        isLoading={isSubmittingClient}
        isOpen={isFormOpen}
        mode={editingClient ? "edit" : "create"}
        onOpenChange={setIsFormOpen}
        onSubmit={submitClient}
      />
      <EndPlanDialog
        assignment={selectedAssignment}
        isEnding={isEndingPlan}
        isOpen={isEndPlanOpen}
        onConfirm={endCurrentPlanForSelectedClient}
        onOpenChange={setIsEndPlanOpen}
      />
    </>
  );

  if (mode === "detail") {
    return (
      <WorkspaceFrame
        header={
          <WorkspaceHeader
            description={selectedClient?.mainGoal ?? "Datos operativos, acceso y plan actual del cliente."}
            title={selectedClient?.name ?? "Ficha de cliente"}
            actions={
              <Button asChild className="shadow-none" variant="outline">
                <Link href="/clients">Volver a clientes</Link>
              </Button>
            }
          />
        }
      >
        <WorkspaceSplit
          main={
            <div className="flex flex-col gap-5 bg-background p-6">
              {error ? <ClientErrorCard error={error} /> : null}

              {isInitialLoading && !selectedClient ? (
                <ClientDetailLoadingCard />
              ) : selectedClient ? (
                <ClientDetail
                  assignment={selectedAssignment}
                  client={selectedClient}
                  isPlanLoading={assignmentLoadingId === selectedClient.id}
                  variant="page"
                  onEndPlan={() => setIsEndPlanOpen(true)}
                  onEdit={openEditForm}
                  onStatusChange={updateStatus}
                />
              ) : (
                <ClientNotFoundCard />
              )}
            </div>
          }
          side={
            <div className="p-5">
              {selectedClient ? (
                <ClientQuickPanel
                  assignment={selectedAssignment}
                  client={selectedClient}
                  onEdit={() => openEditForm(selectedClient)}
                  onEndPlan={() => setIsEndPlanOpen(true)}
                />
              ) : isInitialLoading ? (
                <PanelSkeleton rows={4} titleWidth="w-32" />
              ) : null}
            </div>
          }
        />

        {sharedDialogs}
      </WorkspaceFrame>
    );
  }

  return (
    <WorkspaceFrame
      header={
        <WorkspaceHeader
          description="Gestiona planes, acceso y seguimiento desde una sola vista."
          title="Clientes"
          actions={
            <Button className="shadow-none" onClick={openCreateForm}>
              <PlusIcon className="size-4" />
              Nuevo cliente
            </Button>
          }
        />
      }
    >
      <div className="flex min-h-0 flex-1 flex-col xl:flex-row">
        <div className="min-w-0 flex-1">
          <div className="bg-background px-4 py-5 sm:px-6 xl:pr-2">
            {isInitialLoading ? (
              <ClientMetricsSkeleton />
            ) : (
              <ClientMetrics
                accessCount={accessCount}
                activeCount={activeCount}
                assignmentCount={assignmentCount}
                pausedInactiveCount={pausedInactiveCount}
                totalCount={visibleClients.length}
              />
            )}
          </div>

          <ClientList
            assignmentsByClient={visibleAssignmentsByClient}
            clients={displayClients}
            error={error}
            isLoading={isInitialLoading}
            query={query}
            selectedClientId={selectedClient?.id ?? ""}
            statusFilter={statusFilter}
            onCreateClient={openCreateForm}
            onEditClient={(client) => {
              setSelectedId(client.id);
              openEditForm(client);
            }}
            onEndPlan={(client) => {
              setSelectedId(client.id);
              setIsEndPlanOpen(true);
            }}
            onOpenClient={(clientId) => {
              setSelectedId(clientId);
              setIsDetailSheetOpen(true);
            }}
            onQueryChange={setQuery}
            onStatusFilterChange={setStatusFilter}
          />
        </div>

        <div className="min-w-0 bg-background xl:w-[320px] xl:min-w-[280px] xl:max-w-[380px] xl:resize-x xl:overflow-auto">
          {isInitialLoading ? <ClientActivitySkeletonPanel /> : <ClientActivityPanel />}
        </div>
      </div>

      {isDetailSheetOpen && selectedClient ? (
        <DetailDrawer
          description="Ficha operativa, plan actual, acceso y notas del cliente seleccionado."
          open={isDetailSheetOpen}
          title="Detalle de cliente"
          onOpenChange={setIsDetailSheetOpen}
        >
          <ClientDetail
            assignment={selectedAssignment}
            client={selectedClient}
            isPlanLoading={assignmentLoadingId === selectedClient.id}
            onEndPlan={() => setIsEndPlanOpen(true)}
            onEdit={openEditForm}
            onStatusChange={updateStatus}
          />
        </DetailDrawer>
      ) : null}

      {sharedDialogs}
    </WorkspaceFrame>
  );
}

function ClientMetricsSkeleton() {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="rounded-2xl border !border-transparent bg-card p-3 shadow-[var(--surface-shadow-soft)]">
          <div className="h-3 w-20 animate-pulse rounded-md bg-muted" />
          <div className="mt-4 h-7 w-10 animate-pulse rounded-md bg-muted" />
          <div className="mt-2 h-3 w-24 animate-pulse rounded-md bg-muted" />
        </div>
      ))}
    </div>
  );
}

function ClientQuickPanel({
  assignment,
  client,
  onEdit,
  onEndPlan,
}: {
  assignment: CurrentPlanAssignment | null | undefined;
  client: Client;
  onEdit: () => void;
  onEndPlan: () => void;
}) {
  const hasPlan = Boolean(assignment?.assignedPlan);
  return (
    <WorkspacePanel title="Acciones rápidas" description="Operaciones frecuentes de esta ficha.">
      <div className="flex flex-col gap-2 p-4">
        <Button className="justify-start shadow-none" variant="outline" onClick={onEdit}>
          Editar cliente
        </Button>
        {hasPlan ? (
          <>
            <Button asChild className="justify-start shadow-none" variant="outline">
              <Link href={`/clients/${client.id}/plan-assignment/edit`}>Editar plan actual</Link>
            </Button>
            <Button className="justify-start shadow-none" variant="outline" onClick={onEndPlan}>
              Finalizar plan actual
            </Button>
          </>
        ) : (
          <Button asChild className="justify-start shadow-none">
            <Link href={`/clients/${client.id}/plan-assignment`}>Asignar plan</Link>
          </Button>
        )}
        <Button asChild className="justify-start shadow-none" variant="outline">
          <Link href={`/clients/${client.id}/access`}>Gestionar acceso</Link>
        </Button>
      </div>
    </WorkspacePanel>
  );
}
