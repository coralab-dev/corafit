"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { AssignPlanDialog, ClientDetail, ClientFormDialog, ClientList, CurrentPlanSheet, EndPlanDialog } from "@/components/clients/components";
import { ClientActivityPanel, ClientDetailLoadingCard, ClientErrorCard, ClientMetrics, ClientNotFoundCard } from "@/components/clients/workspace-panels";
import { apiRequest, clientSchema, emptyDefaults, formatDate, getErrorMessage, getInitialApiConfig, normalizeFormValues, statusLabels } from "@/lib/clients/api";
import type { ClientFormValues } from "@/lib/clients/api";
import type { ApiConfig, Client, ClientAccess, ClientsResponse, CurrentPlanAssignment, OperationalStatus, PlansResponse, TrainingPlan } from "@/lib/clients/types";

interface ClientsWorkspaceProps {
  mode?: "list" | "detail";
  selectedClientId?: string;
}

export function ClientsWorkspace({ mode = "list", selectedClientId }: ClientsWorkspaceProps = {}) {
  const searchParams = useSearchParams();
  const selectedFromQuery = selectedClientId ?? searchParams.get("selected");
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [selectedId, setSelectedId] = useState("");
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
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isCurrentPlanOpen, setIsCurrentPlanOpen] = useState(false);
  const [isEndPlanOpen, setIsEndPlanOpen] = useState(false);
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [plansError, setPlansError] = useState("");
  const [isPlansLoading, setIsPlansLoading] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [previewPlan, setPreviewPlan] = useState<TrainingPlan | null>(null);
  const [previewError, setPreviewError] = useState("");
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [assignmentStartDate, setAssignmentStartDate] = useState("");
  const [isAssigningPlan, setIsAssigningPlan] = useState(false);
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

  async function openAssignPlanDialog(client = selectedClient) {
    if (!client) {
      return;
    }

    setSelectedId(client.id);
    setIsAssignDialogOpen(true);
    setPlansError("");
    setPreviewError("");
    setSelectedPlanId("");
    setPreviewPlan(null);
    setAssignmentStartDate("");

    if (!isApiReady) {
      setPlansError("Configura la conexion al API para asignar planes reales.");
      return;
    }

    setIsPlansLoading(true);
    try {
      const response = await apiRequest<PlansResponse>(
        "/training-plans?page=1&limit=50&status=active",
        { method: "GET" },
        apiConfig,
      );
      setPlans(response.items);
      const firstPlanId = response.items[0]?.id ?? "";
      setSelectedPlanId(firstPlanId);
      if (!firstPlanId) {
        setPreviewPlan(null);
      }
    } catch (caughtError) {
      setPlansError(getErrorMessage(caughtError));
    } finally {
      setIsPlansLoading(false);
    }
  }

  async function assignPlanToSelectedClient() {
    if (!selectedClient || !selectedPlanId) {
      return;
    }

    setIsAssigningPlan(true);
    setPlansError("");
    try {
      await apiRequest(
        `/clients/${selectedClient.id}/assign-plan`,
        {
          method: "POST",
          body: JSON.stringify({
            trainingPlanId: selectedPlanId,
            ...(assignmentStartDate ? { startDate: assignmentStartDate } : {}),
          }),
        },
        apiConfig,
      );
      await loadCurrentPlanAssignment(selectedClient.id);
      setIsAssignDialogOpen(false);
      toast.success("Plan asignado");
    } catch (caughtError) {
      const message = getErrorMessage(caughtError);
      setPlansError(
        message.includes("ACTIVE_ASSIGNMENT_EXISTS")
          ? "El cliente ya tiene un plan activo. Finaliza el plan actual antes de asignar otro."
          : message,
      );
      if (message.includes("ACTIVE_ASSIGNMENT_EXISTS")) {
        void loadCurrentPlanAssignment(selectedClient.id);
      }
    } finally {
      setIsAssigningPlan(false);
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

  useEffect(() => {
    if (!isAssignDialogOpen || !selectedPlanId || !isApiReady) {
      return;
    }

    const timer = window.setTimeout(() => {
      setIsPreviewLoading(true);
      setPreviewError("");
      void apiRequest<TrainingPlan>(
        `/training-plans/${selectedPlanId}`,
        { method: "GET" },
        apiConfig,
      )
        .then(setPreviewPlan)
        .catch((caughtError) => {
          setPreviewPlan(null);
          setPreviewError(getErrorMessage(caughtError));
        })
        .finally(() => setIsPreviewLoading(false));
    }, 0);

    return () => window.clearTimeout(timer);
  }, [apiConfig, isApiReady, isAssignDialogOpen, selectedPlanId]);

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
      <AssignPlanDialog
        error={plansError}
        isAssigning={isAssigningPlan}
        isLoadingPlans={isPlansLoading}
        isLoadingPreview={isPreviewLoading}
        isOpen={isAssignDialogOpen}
        plans={plans}
        previewError={previewError}
        previewPlan={previewPlan}
        selectedPlanId={selectedPlanId}
        startDate={assignmentStartDate}
        onAssign={assignPlanToSelectedClient}
        onOpenChange={setIsAssignDialogOpen}
        onPlanChange={(planId) => {
          setSelectedPlanId(planId);
          setPreviewPlan(null);
        }}
        onStartDateChange={setAssignmentStartDate}
      />
      <CurrentPlanSheet
        assignment={selectedAssignment}
        isOpen={isCurrentPlanOpen}
        onOpenChange={setIsCurrentPlanOpen}
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
      <div className="flex flex-col gap-4">
        <PageHeader
          eyebrow="Clientes"
          title={selectedClient?.name ?? "Ficha de cliente"}
          description="Datos operativos, acceso y plan actual del cliente."
          actions={
            <Button asChild variant="outline">
              <Link href="/clients">Volver a clientes</Link>
            </Button>
          }
        />

        {error ? (
          <ClientErrorCard error={error} />
        ) : null}

        {isLoading ? (
          <ClientDetailLoadingCard />
        ) : selectedClient ? (
          <ClientDetail
            assignment={selectedAssignment}
            client={selectedClient}
            isPlanLoading={assignmentLoadingId === selectedClient.id}
            onEndPlan={() => setIsEndPlanOpen(true)}
            onEdit={openEditForm}
            onOpenAssignPlan={openAssignPlanDialog}
            onOpenCurrentPlan={() => setIsCurrentPlanOpen(true)}
            onStatusChange={updateStatus}
          />
        ) : (
          <ClientNotFoundCard />
        )}

        {sharedDialogs}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow="Clientes"
        title="Gestion de clientes"
        description="Administra tus clientes, planes y accesos al portal."
        actions={
          <Button onClick={openCreateForm}>
            <PlusIcon className="mr-2 size-4" />
            Nuevo cliente
          </Button>
        }
      />

      {/* MÃ©tricas estilo referencia */}
      <ClientMetrics
        accessCount={accessCount}
        activeCount={activeCount}
        assignmentCount={Object.values(assignmentsByClient).filter(Boolean).length}
        totalCount={allClients.length}
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
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
          onOpenAssignPlan={openAssignPlanDialog}
          onOpenCurrentPlan={(client) => {
            setSelectedId(client.id);
            setIsCurrentPlanOpen(true);
          }}
          onQueryChange={setQuery}
          onSelectClient={setSelectedId}
          onStatusFilterChange={setStatusFilter}
        />

        <ClientActivityPanel />
      </div>

      {sharedDialogs}
    </div>
  );
}
