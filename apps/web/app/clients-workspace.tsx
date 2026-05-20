"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ActivityIcon,
  DumbbellIcon,
  KeyRoundIcon,
  PlusIcon,
  RefreshCwIcon,
  SmartphoneIcon,
  UsersIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ApiConfigDialog, AssignPlanDialog, ClientDetail, ClientFormDialog, ClientList, CurrentPlanSheet, EmptyState, EndPlanDialog, MetricCard, NavItem } from "@/components/clients/components";
import { apiBaseUrl, apiConfigStorageKey, apiRequest, clientSchema, emptyDefaults, formatDate, getErrorMessage, getInitialApiConfig, hasStoredApiConfig, normalizeFormValues, statusLabels } from "@/lib/clients/api";
import type { ClientFormValues } from "@/lib/clients/api";
import type { AccessStatus, ApiConfig, Client, ClientAccess, ClientsResponse, CurrentPlanAssignment, OperationalStatus, PlansResponse, TrainingPlan } from "@/lib/clients/types";

export function ClientsWorkspace() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<OperationalStatus | "all">("all");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [apiConfig, setApiConfig] = useState<ApiConfig>(getInitialApiConfig);
  const [isConfigOpen, setIsConfigOpen] = useState(() => !hasStoredApiConfig());
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

  const selectedClient = clients.find((client) => client.id === selectedId);
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

      setClients((current) =>
        current.map((client) =>
          client.id === clientId
            ? {
                ...client,
                access: access
                  ? {
                      id: access.id,
                      lastAccessAt: access.lastAccessAt,
                      lockedUntil: access.lockedUntil,
                      status: access.status,
                      updatedAt: formatDate(access.lastAccessAt ?? access.lockedUntil),
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
      setClients([]);
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

      if (query.trim()) {
        searchParams.set("search", query.trim());
      }

      if (statusFilter !== "all") {
        searchParams.set("status", statusFilter);
      }

      const response = await apiRequest<ClientsResponse>(
        `/clients?${searchParams.toString()}`,
        { method: "GET" },
        apiConfig,
      );
      const nextClients = response.items.map((client) => ({
        ...client,
        access: { status: "none" as const },
      }));

      setClients(nextClients);
      void loadAssignmentsForClients(nextClients);
      setSelectedId((current) => {
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
  }, [apiConfig, isApiReady, loadAssignmentsForClients, query, statusFilter]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadClients();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadClients]);

  useEffect(() => {
    if (selectedId) {
      const timer = window.setTimeout(() => {
        void loadAccessForClient(selectedId);
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
      void loadCurrentPlanAssignment(selectedId)
        .catch((caughtError) => {
          setAssignmentsByClient((current) => ({
            ...current,
            [selectedId]: null,
          }));
          setError(getErrorMessage(caughtError));
        })
        .finally(() => {
          setAssignmentLoadingId((current) => (current === selectedId ? "" : current));
        });
    }, 0);

    return () => window.clearTimeout(timer);
  }, [isApiReady, loadCurrentPlanAssignment, selectedId]);

  const filteredClients = clients;

  const activeCount = clients.filter(
    (client) => client.operationalStatus === "active",
  ).length;
  const accessCount = clients.filter((client) => client.access.status === "active").length;

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
        setClients((current) =>
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
        setClients((current) => [
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

  async function generateAccess(clientId: string) {
    setError("");
    try {
      const currentClient = clients.find((client) => client.id === clientId);
      const endpoint =
        currentClient?.access.status === "none" ||
        currentClient?.access.status === "disabled"
          ? `/clients/${clientId}/access`
          : `/clients/${clientId}/access/regenerate-pin`;
      const response = await apiRequest<{
        access: { id: string; status: AccessStatus };
        link: string;
        pin: string;
      }>(endpoint, { method: "POST" }, apiConfig);

      setClients((current) =>
        current.map((client) =>
          client.id === clientId
            ? {
                ...client,
                access: {
                  id: response.access.id,
                  link: response.link,
                  pin: response.pin,
                  status: response.access.status,
                  updatedAt: "Ahora",
                },
              }
            : client,
        ),
      );
      toast.success("Acceso generado");
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    }
  }

  async function disableAccess(clientId: string) {
    setError("");
    try {
      await apiRequest<ClientAccess>(
        `/clients/${clientId}/access/disable`,
        { method: "PATCH" },
        apiConfig,
      );
      setClients((current) =>
        current.map((client) =>
          client.id === clientId
            ? { ...client, access: { status: "disabled", updatedAt: "Ahora" } }
            : client,
        ),
      );
      toast.success("Acceso desactivado");
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
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
      setClients((current) =>
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

  async function openAssignPlanDialog() {
    if (!selectedClient) {
      return;
    }

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

  function saveApiConfig(nextConfig: ApiConfig) {
    const normalizedConfig = {
      apiUrl: nextConfig.apiUrl.replace(/\/$/, ""),
      bearerToken: nextConfig.bearerToken.trim(),
      organizationId: nextConfig.organizationId.trim(),
    };
    setApiConfig(normalizedConfig);
    window.localStorage.setItem(apiConfigStorageKey, JSON.stringify(normalizedConfig));
    setIsConfigOpen(false);
    toast.success("Conexion configurada");
  }

  function clearApiConfig() {
    window.localStorage.removeItem(apiConfigStorageKey);
    setApiConfig({ apiUrl: apiBaseUrl, bearerToken: "", organizationId: "" });
    setClients([]);
    setSelectedId("");
    setIsConfigOpen(true);
  }

  async function copyAccess(link: string | undefined) {
    if (!link) {
      setError("El backend solo devuelve el link al generar o regenerar acceso.");
      return;
    }

    await navigator.clipboard.writeText(link);
    toast.success("Link copiado");
  }

  function refreshClients() {
    void loadClients();
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col gap-4 p-4 lg:flex-row lg:p-6">
        <aside className="hidden w-64 shrink-0 rounded-xl border bg-card p-4 lg:flex lg:flex-col">
          <div className="flex items-center gap-3 px-2 py-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-primary">
              <DumbbellIcon />
            </div>
            <div>
              <p className="text-lg font-semibold tracking-normal">CoraFit</p>
              <p className="text-xs text-muted-foreground">Coach OS</p>
            </div>
          </div>
          <nav className="mt-8 flex flex-col gap-2">
            <NavItem href="/" icon={ActivityIcon} label="Dashboard" />
            <NavItem href="/clients" icon={UsersIcon} label="Clientes" active />
            <NavItem href="/training-plans" icon={DumbbellIcon} label="Planes" />
            <NavItem icon={SmartphoneIcon} label="Portal" />
          </nav>
          <div className="mt-auto rounded-lg border bg-background p-3">
            <p className="text-sm font-semibold">Alex Ruiz</p>
            <p className="text-xs text-muted-foreground">Owner / Coach</p>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col gap-4">
          <header className="flex flex-col gap-4 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Clientes</p>
              <h1 className="text-3xl font-semibold leading-tight">
                Gestion de clientes
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ThemeToggle />
              <Button variant="outline" onClick={() => setIsConfigOpen(true)}>
                <KeyRoundIcon data-icon="inline-start" />
                Conexion
              </Button>
              <Button variant="outline" onClick={refreshClients}>
                <RefreshCwIcon data-icon="inline-start" />
                Actualizar
              </Button>
              <Button onClick={openCreateForm}>
                <PlusIcon data-icon="inline-start" />
                Nuevo cliente
              </Button>
            </div>
          </header>

          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard label="Clientes totales" value={String(clients.length)} />
            <MetricCard label="Activos" value={String(activeCount)} />
            <MetricCard label="Accesos activos" value={String(accessCount)} />
          </div>

          <div className="grid min-h-[640px] gap-4 xl:grid-cols-[410px_1fr]">
            <ClientList
              assignmentsByClient={assignmentsByClient}
              clients={filteredClients}
              error={error}
              isLoading={isLoading}
              query={query}
              selectedClientId={selectedClient?.id ?? ""}
              statusFilter={statusFilter}
              onCreateClient={openCreateForm}
              onQueryChange={setQuery}
              onSelectClient={setSelectedId}
              onStatusFilterChange={setStatusFilter}
            />

            {selectedClient ? (
              <ClientDetail
                assignment={selectedAssignment}
                client={selectedClient}
                isPlanLoading={assignmentLoadingId === selectedClient.id}
                onCopyAccess={copyAccess}
                onDisableAccess={disableAccess}
                onEndPlan={() => setIsEndPlanOpen(true)}
                onEdit={openEditForm}
                onGenerateAccess={generateAccess}
                onOpenAssignPlan={openAssignPlanDialog}
                onOpenCurrentPlan={() => setIsCurrentPlanOpen(true)}
                onStatusChange={updateStatus}
              />
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <EmptyState
                    title="Selecciona un cliente"
                    description="La ficha operativa aparecera aqui."
                  />
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      </div>

      <ClientFormDialog
        form={form}
        isLoading={isLoading}
        isOpen={isFormOpen}
        mode={editingClient ? "edit" : "create"}
        onOpenChange={setIsFormOpen}
        onSubmit={submitClient}
      />
      <ApiConfigDialog
        key={`${apiConfig.apiUrl}-${apiConfig.organizationId}-${apiConfig.bearerToken.length}`}
        config={apiConfig}
        isOpen={isConfigOpen}
        onClear={clearApiConfig}
        onOpenChange={setIsConfigOpen}
        onSave={saveApiConfig}
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
    </main>
  );
}
