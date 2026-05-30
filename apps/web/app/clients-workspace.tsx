"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DownloadIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { WorkspaceFrame, WorkspaceHeader, WorkspacePanel, WorkspaceSplit } from "@/components/layout/workspace-shell";
import { ClientDetail, ClientFormDialog, ClientList, EndPlanDialog } from "@/components/clients/components";
import { ClientActivityPanel, ClientDetailLoadingCard, ClientErrorCard, ClientMetrics, ClientNotFoundCard } from "@/components/clients/workspace-panels";
import { DetailDrawer } from "@/components/shared/detail-drawer";
import { apiRequest, clientSchema, emptyDefaults, formatDate, getErrorMessage, getInitialApiConfig, normalizeFormValues, statusLabels } from "@/lib/clients/api";
import type { ClientFormValues } from "@/lib/clients/api";
import type { ApiConfig, Client, ClientAccess, ClientsResponse, CurrentPlanAssignment, OperationalStatus } from "@/lib/clients/types";

interface ClientsWorkspaceProps {
  mode?: "list" | "detail";
  selectedClientId?: string;
}

export function ClientsWorkspace({ mode = "list", selectedClientId }: ClientsWorkspaceProps = {}) {
  const searchParams = useSearchParams();
  const selectedFromQuery = selectedClientId ?? searchParams.get("selected");
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<OperationalStatus | "all">("all");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [apiConfig] = useState<ApiConfig>(getInitialApiConfig);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [assignmentsByClient, setAssignmentsByClient] = useState<
    Record<string, CurrentPlanAssignment | null>
  >({});
  const [assignmentLoadingId, setAssignmentLoadingId] = useState("");
  const [isEndPlanOpen, setIsEndPlanOpen] = useState(false);
  const [isEndingPlan, setIsEndingPlan] = useState(false);

  const selectedClient = allClients.find((client) => client.id === selectedId);
  const selectedAssignment = selectedClient
    ? assignmentsByClient[selectedClient.id]
    : null;
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    mode: "onSubmit",
    reValidateMode: "onBlur",
    defaultValues: emptyDefaults,
  });

  const isApiReady = Boolean(apiConfig.bearerToken.trim() && apiConfig.organizationId.trim());

  const loadCurrentPlanAssignment = useCallback(
    async (clientId: string) => {
      if (!isApiReady) {
        return null;
      }

      const assignment = await apiRequest<CurrentPlanAssignment | null>(
        `/clients/${clientId}/plan-assignment/current`,
        { method: "GET" },
        apiConfig,
      );

      setAssignmentsByClient((current) => ({
        ...current,
        [clientId]: assignment,
      }));

      return assignment;
    },
    [apiConfig, isApiReady],
  );

  const loadAssignmentsForClients = useCallback(
    async (items: Client[]) => {
      if (!isApiReady || !items.length) {
        setAssignmentsByClient({});
        return;
      }

      const results = await Promise.all(
        items.map(async (client) => {
          try {
            const assignment = await apiRequest<CurrentPlanAssignment | null>(
              `/clients/${client.id}/plan-assignment/current`,
              { method: "GET" },
              apiConfig,
            );
            return [client.id, assignment] as const;
          } catch {
            return [client.id, null] as const;
          }
        }),
      );

      setAssignmentsByClient(Object.fromEntries(results));
    },
    [apiConfig, isApiReady],
  );

  const loadAccessForClient = useCallback(
    async (clientId: string) => {
      if (!isApiReady) {
        return;
      }

      const access = await apiRequest<ClientAccess | null>(
        `/clients/${clientId}/access`,
        { method: "GET" },
        apiConfig,
      );

      setAllClients((current) =>
        current.map((client) =>
          client.id === clientId
            ? {
                ...client,
                access: access
                  ? {
                      id: access.id,
                      createdAt: access.createdAt,
                      lastAccessAt: access.lastAccessAt,
                      lockedUntil: access.lockedUntil,
                      status: access.status,
                      updatedAtRaw: access.updatedAt,
                      updatedAt: formatDate(access.updatedAt ?? access.lastAccessAt ?? access.lockedUntil),
                    }
                  : { status: "none" },
              }
            : client,
        ),
      );
    },
    [apiConfig, isApiReady],
  );

  const loadClients = useCallback(async () => {
    if (!isApiReady) {
      setAllClients([]);
      setError("Configura el JWT del coach y la organizacion para leer clientes reales.");
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      const searchParams = new URLSearchParams({
        page: "1",
        limit: "50",
      });

      const response = await apiRequest<ClientsResponse>(
        `/clients?${searchParams.toString()}`,
        { method: "GET" },
        apiConfig,
      );
      const nextClients = response.items.map((client) => ({
        ...client,
        access: { status: "none" as const },
      }));

      setAllClients(nextClients);
      void loadAssignmentsForClients(nextClients);
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
      setIsLoading(false);
    }
  }, [apiConfig, isApiReady, loadAssignmentsForClients, selectedFromQuery]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadClients();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadClients]);

  useEffect(() => {
    if (selectedId) {
      const timer = window.setTimeout(() => {
        void loadAccessForClient(selectedId).catch((caughtError) => {
          setError(getErrorMessage(caughtError));
        });
      }, 0);

      return () => window.clearTimeout(timer);
    }
  }, [loadAccessForClient, selectedId]);

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

    return allClients.filter((client) => {
      const matchesStatus =
        statusFilter === "all" || client.operationalStatus === statusFilter;
      const matchesQuery =
        !normalizedQuery ||
        client.name.toLowerCase().includes(normalizedQuery) ||
        client.phone.toLowerCase().includes(normalizedQuery) ||
        client.mainGoal.toLowerCase().includes(normalizedQuery);

      return matchesStatus && matchesQuery;
    });
  }, [allClients, query, statusFilter]);

  const activeCount = allClients.filter(
    (client) => client.operationalStatus === "active",
  ).length;
  const accessCount = allClients.filter((client) => client.access.status === "active").length;

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
    setIsLoading(true);
    setError("");

    try {
      const payload = normalizeFormValues(values);

      if (editingClient) {
        const updatedClient = await apiRequest<Omit<Client, "access">>(
          `/clients/${editingClient.id}`,
          { method: "PATCH", body: JSON.stringify(payload) },
          apiConfig,
        );
        setAllClients((current) =>
          current.map((client) =>
            client.id === editingClient.id
              ? { ...updatedClient, access: client.access }
              : client,
          ),
        );
        toast.success("Cliente actualizado");
      } else {
        const createdClient = await apiRequest<Omit<Client, "access">>(
          "/clients",
          { method: "POST", body: JSON.stringify(payload) },
          apiConfig,
        );
        setAllClients((current) => [
          { ...createdClient, access: { status: "none" } },
          ...current,
        ]);
        setSelectedId(createdClient.id);
        toast.success("Cliente creado");
      }

      setIsFormOpen(false);
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setIsLoading(false);
    }
  }

  async function updateStatus(clientId: string, status: OperationalStatus) {
    setError("");
    try {
      const updatedClient = await apiRequest<Omit<Client, "access">>(
        `/clients/${clientId}/status`,
        { method: "PATCH", body: JSON.stringify({ status }) },
        apiConfig,
      );
      setAllClients((current) =>
        current.map((client) =>
          client.id === clientId
            ? { ...updatedClient, access: client.access }
            : client,
        ),
      );
      toast.success(`Cliente ${statusLabels[status].toLowerCase()}`);
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
      await apiRequest(
        `/clients/${selectedClient.id}/plan-assignment/current/end`,
        { method: "POST" },
        apiConfig,
      );
      await loadCurrentPlanAssignment(selectedClient.id);
      setIsEndPlanOpen(false);
      toast.success("Plan finalizado");
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
        isLoading={isLoading}
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

              {isLoading ? (
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
            <>
              <Button className="shadow-none" variant="outline" disabled>
                <DownloadIcon className="size-4" />
                Importar
              </Button>
              <Button className="shadow-none" onClick={openCreateForm}>
                <PlusIcon className="size-4" />
                Nuevo cliente
              </Button>
            </>
          }
        />
      }
    >
      {/* MÃ©tricas estilo referencia */}
      <div className="flex min-h-0 flex-1 flex-col xl:flex-row">
        <div className="min-w-0 flex-1 border-r">
          <div className="border-b bg-background px-6 py-5">
            <ClientMetrics
              accessCount={accessCount}
              activeCount={activeCount}
              assignmentCount={Object.values(assignmentsByClient).filter(Boolean).length}
              totalCount={allClients.length}
            />
          </div>

          <ClientList
            assignmentsByClient={assignmentsByClient}
            clients={displayClients}
            error={error}
            isLoading={isLoading}
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

        <div className="min-w-0 bg-background xl:w-[320px] xl:min-w-[280px] xl:max-w-[420px] xl:resize-x xl:overflow-auto">
          <ClientActivityPanel />
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
 /* hola */
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
