"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { ConfirmActionDialog } from "@/components/shared/confirm-action-dialog";
import { DetailDrawer } from "@/components/shared/detail-drawer";
import { PanelSkeleton } from "@/components/shared/skeletons";
import { CoraFitApiError, authenticatedRequest } from "@/lib/api/authenticated-request";
import { fetchAllPages } from "@/lib/pagination";
import { clientSchema, emptyDefaults, getErrorMessage, normalizeFormValues, statusLabels } from "@/lib/clients/api";
import type { ClientFormValues } from "@/lib/clients/api";
import { createLatestRequestController } from "@/hooks/latest-request-controller";
import {
  beginClientAssignmentLoad,
  confirmClientAssignmentAbsent,
  confirmClientAssignmentEnded,
  failClientAssignmentLoad,
  idleClientAssignmentState,
  invalidateClientAssignmentLoad,
  resolveClientAssignmentLoadDecision,
  resolveClientAssignmentSuccess,
} from "@/components/clients/client-assignment-state";
import {
  idleClientDetailState,
  loadingClientDetailState,
  normalizeClient,
  reduceClientDetailState,
  resolveClientDetailState,
} from "@/components/clients/client-detail-state";
import {
  getClientsForStatusFilter,
  getOperationalClientMetrics,
  mergeClientCollections,
  type ClientStatusFilter,
} from "@/components/clients/client-list-state";
import {
  beginClientStatusMutation,
  clearClientStatusMutationError,
  failClientStatusMutation,
  finishClientStatusMutation,
  getClientStatusMutationError,
  idleClientStatusMutationState,
  isClientStatusMutationPending,
  matchesCurrentMutation,
  type ClientStatusMutationState,
} from "@/components/clients/client-status-state";
import type {
  Client,
  ClientAccess,
  ClientDetailResponse,
  ClientsResponse,
  CurrentPlanAssignment,
  OperationalStatus,
} from "@/lib/clients/types";

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
  const [statusFilter, setStatusFilter] = useState<ClientStatusFilter>("all");
  const [isListLoading, setIsListLoading] = useState(false);
  const [detailState, setDetailState] = useState(idleClientDetailState);
  const detailRequestRef = useRef(0);
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;
  const isDetailSheetOpenRef = useRef(isDetailSheetOpen);
  isDetailSheetOpenRef.current = isDetailSheetOpen;
  const [isSubmittingClient, setIsSubmittingClient] = useState(false);
  const [error, setError] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [assignmentsByClient, setAssignmentsByClient] = useState<
    Record<string, CurrentPlanAssignment | null>
  >({});
  const assignmentsByClientRef = useRef(assignmentsByClient);
  assignmentsByClientRef.current = assignmentsByClient;
  const assignmentRequestRef = useRef(createLatestRequestController());
  const [assignmentState, setAssignmentState] = useState(idleClientAssignmentState);
  const [isEndPlanOpen, setIsEndPlanOpen] = useState(false);
  const [isEndingPlan, setIsEndingPlan] = useState(false);
  const [statusMutation, setStatusMutation] = useState<ClientStatusMutationState>(
    idleClientStatusMutationState,
  );
  const statusMutationRef = useRef<ClientStatusMutationState>(idleClientStatusMutationState);
  const statusMutationRequestRef = useRef(0);
  const [archiveCandidate, setArchiveCandidate] = useState<Client | null>(null);
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
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
  const operationalMetrics = useMemo(
    () => getOperationalClientMetrics(visibleClients, visibleAssignmentsByClient),
    [visibleAssignmentsByClient, visibleClients],
  );
  const selectedClient = visibleClients.find((client) => client.id === selectedId);
  const selectedAssignment = selectedClient
    ? visibleAssignmentsByClient[selectedClient.id]
    : null;
  const selectedDrawerAssignmentState =
    assignmentState.clientId === selectedId ? assignmentState : null;
  const drawerAssignment =
    selectedDrawerAssignmentState?.assignment !== undefined
      ? selectedDrawerAssignmentState.assignment
      : selectedAssignment;
  const drawerAssignmentError = selectedDrawerAssignmentState?.error ?? null;
  const isDrawerPlanLoading = selectedDrawerAssignmentState?.status === "loading";
  const currentDetailClient =
    detailState.status === "ready" && detailState.client.id === selectedClientId
      ? detailState.client
      : null;
  const currentDetailAssignment = currentDetailClient ? detailState.assignment : null;
  const actionClient = mode === "detail" ? currentDetailClient : selectedClient;
  const actionAssignment = mode === "detail"
    ? currentDetailClient
      ? currentDetailAssignment
      : null
    : selectedAssignment;
  const pendingStatusClientId =
    statusMutation.status === "pending" ? statusMutation.clientId : null;
  const archiveError = getClientStatusMutationError(
    statusMutation,
    archiveCandidate?.id,
    "archived",
  );
  const isInitialLoading =
    (authStatus === "loading" && !hasLoadedClients) ||
    (isListLoading && !hasLoadedClients);
  const isRefreshing = isListLoading && hasLoadedClients;

  const clientsRequest = useCallback(
    <T,>(path: string, init: RequestInit = {}) =>
      authenticatedRequest<T>(path, init, {
        organizationId,
        session: sessionRef.current,
      }),
    [organizationId],
  );

  const loadCurrentPlanAssignment = useCallback(
    async (clientId: string) => {
      if (!isApiReady) {
        return null;
      }

      const { knownAssignment, shouldFetch } = resolveClientAssignmentLoadDecision({
        assignmentsByClient: assignmentsByClientRef.current,
        clientId,
      });

      if (!shouldFetch) {
        assignmentRequestRef.current.invalidate();
        setAssignmentState((current) =>
          confirmClientAssignmentAbsent(current, clientId),
        );
        return null;
      }

      const request = assignmentRequestRef.current.start();

      setAssignmentState((current) =>
        beginClientAssignmentLoad(current, {
          clientId,
          knownAssignment,
          requestId: request.id,
        }),
      );

      const isCurrentDrawerRequest = () =>
        assignmentRequestRef.current.isCurrent(request.id) &&
        isDetailSheetOpenRef.current &&
        selectedIdRef.current === clientId;

      try {
        const assignment = await clientsRequest<CurrentPlanAssignment | null>(
          `/clients/${clientId}/plan-assignment/current`,
          { method: "GET", signal: request.signal },
        );

        if (!isCurrentDrawerRequest()) {
          return null;
        }

        setAssignmentsByClient((current) => ({
          ...current,
          [clientId]: assignment,
        }));
        setAllClients((current) =>
          current.map((client) =>
            client.id === clientId
              ? { ...client, currentAssignment: assignment }
              : client,
          ),
        );
        setAssignmentState((current) =>
          resolveClientAssignmentSuccess(current, {
            assignment,
            clientId,
            requestId: request.id,
          }),
        );

        return assignment;
      } catch (caughtError) {
        if (!isCurrentDrawerRequest()) {
          return null;
        }

        const aborted = caughtError instanceof Error && caughtError.name === "AbortError";
        if (aborted) {
          assignmentRequestRef.current.invalidate();
          setAssignmentState(invalidateClientAssignmentLoad());
          return null;
        }

        setAssignmentState((current) =>
          failClientAssignmentLoad(current, {
            clientId,
            error: getErrorMessage(caughtError),
            requestId: request.id,
          }),
        );
        return null;
      } finally {
        if (assignmentRequestRef.current.isCurrent(request.id)) {
          if (
            isDetailSheetOpenRef.current &&
            selectedIdRef.current === clientId
          ) {
            setAssignmentState((current) => {
              if (current.requestId !== request.id) {
                return current;
              }

              return {
                ...current,
                requestId: null,
                status: current.status === "loading" ? "ready" : current.status,
              };
            });
          }
          assignmentRequestRef.current.finish(request.id);
        }
      }
    },
    [clientsRequest, isApiReady],
  );

  const loadClientDetail = useCallback(
    async (clientId: string, requestId: number) => {
      const isCurrentRequest = () => detailRequestRef.current === requestId;

      if (!clientId || !isCurrentRequest()) {
        return;
      }

      try {
        const [clientResponse, access, assignment] = await Promise.all([
          clientsRequest<ClientDetailResponse>(`/clients/${clientId}`, { method: "GET" }),
          clientsRequest<ClientAccess | null>(`/clients/${clientId}/access`, { method: "GET" }),
          clientsRequest<CurrentPlanAssignment | null>(
            `/clients/${clientId}/plan-assignment/current`,
            { method: "GET" },
          ),
        ]);

        if (!isCurrentRequest()) {
          return;
        }

        setDetailState((current) =>
          reduceClientDetailState(current, clientId, {
            requestedClientId: clientId,
            client: clientResponse,
            access,
            assignment,
          }),
        );

      } catch (caughtError) {
        if (!isCurrentRequest()) {
          return;
        }

        const isNotFound = caughtError instanceof CoraFitApiError && caughtError.status === 404;
        const state = resolveClientDetailState(clientId, {
          requestedClientId: clientId,
          client: null,
          access: null,
          assignment: null,
          error: isNotFound ? undefined : getErrorMessage(caughtError),
          notFound: isNotFound,
        });

        setDetailState((current) => state ?? current);
      }
    },
    [clientsRequest],
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
      const operationalSearchParams = new URLSearchParams();
      const archivedSearchParams = new URLSearchParams({
        status: "archived",
      });

      const [operationalClients, archivedClients] = await Promise.all([
        fetchAllPages({
          params: operationalSearchParams,
          fetchPage: (pageParams) =>
            clientsRequest<ClientsResponse>(
              `/clients?${pageParams.toString()}`,
              { method: "GET" },
            ),
        }),
        fetchAllPages({
          params: archivedSearchParams,
          fetchPage: (pageParams) =>
            clientsRequest<ClientsResponse>(
              `/clients?${pageParams.toString()}`,
              { method: "GET" },
            ),
        }),
      ]);
      const nextClients = mergeClientCollections(
        operationalClients,
        archivedClients,
      ).map((client) => ({
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
    if (mode !== "list") {
      return;
    }

    const timer = window.setTimeout(() => {
      void loadClients();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadClients, mode]);

  useEffect(() => {
    if (mode !== "detail") {
      return;
    }

    const requestId = ++detailRequestRef.current;
    const requestedClientId = selectedClientId ?? "";
    const timer = window.setTimeout(() => {
      if (detailRequestRef.current !== requestId) {
        return;
      }

      setDetailState(idleClientDetailState);
      setError("");

      if (!requestedClientId) {
        return;
      }

      if (!isApiReady) {
        setDetailState(
          authStatus === "loading"
            ? loadingClientDetailState
            : {
                status: "error",
                client: null,
                assignment: null,
                error: "Inicia sesión para leer tus clientes.",
              },
        );
        return;
      }

      setDetailState(loadingClientDetailState);
      void loadClientDetail(requestedClientId, requestId);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      if (detailRequestRef.current === requestId) {
        detailRequestRef.current += 1;
      }
    };
  }, [authStatus, isApiReady, loadClientDetail, mode, selectedClientId]);

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
    const assignmentController = assignmentRequestRef.current;
    assignmentController.invalidate();
    setAssignmentState(invalidateClientAssignmentLoad());

    if (
      mode !== "list" ||
      !isDetailSheetOpen ||
      !hasLoadedClients ||
      !selectedId ||
      !isApiReady
    ) {
      return;
    }

    void loadCurrentPlanAssignment(selectedId);

    return () => {
      assignmentController.invalidate();
      setAssignmentState(invalidateClientAssignmentLoad());
    };
  }, [
    hasLoadedClients,
    isApiReady,
    isDetailSheetOpen,
    loadCurrentPlanAssignment,
    mode,
    selectedId,
  ]);

  const displayClients = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return getClientsForStatusFilter(visibleClients, statusFilter).filter((client) => {
      const matchesQuery =
        !normalizedQuery ||
        client.name.toLowerCase().includes(normalizedQuery) ||
        client.phone.toLowerCase().includes(normalizedQuery) ||
        client.mainGoal.toLowerCase().includes(normalizedQuery);

      return matchesQuery;
    });
  }, [query, statusFilter, visibleClients]);

  function openCreateForm() {
    setEditingClient(null);
    form.reset(emptyDefaults);
    setIsFormOpen(true);
  }

  function openEditForm(client: Client) {
    if (isClientStatusMutationPending(statusMutationRef.current, client.id)) {
      return;
    }

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

  function openArchiveDialog(client: Client) {
    if (statusMutationRef.current.status === "pending") {
      return;
    }

    setCurrentStatusMutation(
      clearClientStatusMutationError(statusMutationRef.current),
    );
    setArchiveCandidate(client);
    setIsArchiveDialogOpen(true);
  }

  function getPendingStatus(clientId: string): OperationalStatus | null {
    return statusMutation.status === "pending" && statusMutation.clientId === clientId
      ? statusMutation.targetStatus
      : null;
  }

  async function submitClient(values: ClientFormValues) {
    if (
      editingClient &&
      isClientStatusMutationPending(statusMutationRef.current, editingClient.id)
    ) {
      return;
    }

    setIsSubmittingClient(true);
    setError("");

    try {
      const payload = normalizeFormValues(values);

      if (editingClient) {
        const editingClientId = editingClient.id;
        const updatedClient = await clientsRequest<ClientDetailResponse>(
          `/clients/${editingClientId}`,
          { method: "PATCH", body: JSON.stringify(payload) },
        );

        if (isClientStatusMutationPending(statusMutationRef.current, editingClientId)) {
          return;
        }

        setAllClients((current) =>
          current.map((client) =>
            client.id === editingClientId
              ? normalizeClient(
                  { ...updatedClient, operationalStatus: client.operationalStatus },
                  client.access,
                  client.currentAssignment,
                )
              : client,
          ),
        );
        setDetailState((current) =>
          current.status === "ready" && current.client.id === editingClientId
            ? {
                ...current,
                client: normalizeClient(
                  {
                    ...updatedClient,
                    operationalStatus: current.client.operationalStatus,
                  },
                  current.client.access,
                  current.client.currentAssignment,
                ),
              }
            : current,
        );
        notify.success("Cliente actualizado");
      } else {
        const createdClient = await clientsRequest<ClientDetailResponse>(
          "/clients",
          { method: "POST", body: JSON.stringify(payload) },
        );
        setAllClients((current) => [
          normalizeClient(createdClient, null, null),
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

  function setCurrentStatusMutation(nextState: ClientStatusMutationState) {
    statusMutationRef.current = nextState;
    setStatusMutation(nextState);
  }

  async function updateStatus(clientId: string, status: OperationalStatus): Promise<boolean> {
    const currentClient =
      (mode === "detail" && currentDetailClient?.id === clientId ? currentDetailClient : null) ??
      allClients.find((client) => client.id === clientId) ??
      null;

    if (!currentClient || currentClient.operationalStatus === status) {
      return false;
    }

    const requestId = ++statusMutationRequestRef.current;
    const nextMutation = beginClientStatusMutation(statusMutationRef.current, {
      requestId,
      clientId,
      status,
      previousStatus: currentClient.operationalStatus,
    });

    if (!nextMutation.didStart) {
      return false;
    }

    setCurrentStatusMutation(nextMutation.state);
    setError("");

    try {
      const updatedClient = await clientsRequest<ClientDetailResponse>(
        `/clients/${clientId}/status`,
        { method: "PATCH", body: JSON.stringify({ status }) },
      );

      if (
        !matchesCurrentMutation(statusMutationRef.current, {
          requestId,
          clientId,
          status,
        })
      ) {
        return false;
      }

      const nextClient = normalizeClient(
        updatedClient,
        currentClient.access,
        currentClient.currentAssignment,
      );

      setAllClients((current) =>
        current.map((client) => (client.id === clientId ? nextClient : client)),
      );
      setDetailState((current) =>
        current.status === "ready" && current.client.id === clientId
          ? {
              ...current,
              client: normalizeClient(
                updatedClient,
                current.client.access,
                current.client.currentAssignment,
              ),
            }
          : current,
      );
      if (mode === "list" && status === "archived") {
        setIsDetailSheetOpen(false);
        setSelectedId((current) => (current === clientId ? "" : current));
      }
      setCurrentStatusMutation(
        finishClientStatusMutation(statusMutationRef.current, {
          requestId,
          clientId,
          status,
        }),
      );
      notify.success(`Cliente ${statusLabels[status].toLowerCase()}`);
      return true;
    } catch (caughtError) {
      if (
        !matchesCurrentMutation(statusMutationRef.current, {
          requestId,
          clientId,
          status,
        })
      ) {
        return false;
      }

      const message = getErrorMessage(caughtError);
      setCurrentStatusMutation(
        failClientStatusMutation(statusMutationRef.current, {
          requestId,
          clientId,
          status,
          error: message,
        }),
      );
      if (status !== "archived") {
        setError(message);
      }
      return false;
    }
  }

  async function endCurrentPlanForSelectedClient() {
    if (!actionClient) {
      return;
    }

    const endingClient = actionClient;
    const endingAssignment = actionAssignment;
    const shouldKeepDrawerState =
      mode === "list" &&
      isDetailSheetOpen &&
      selectedId === endingClient.id;

    assignmentRequestRef.current.invalidate();
    setAssignmentState(invalidateClientAssignmentLoad());
    if (mode === "detail") {
      detailRequestRef.current += 1;
    }

    setIsEndingPlan(true);
    setError("");
    try {
      await clientsRequest(
        `/clients/${endingClient.id}/plan-assignment/current/end`,
        { method: "POST" },
      );

      setAssignmentsByClient((current) => ({
        ...current,
        [endingClient.id]: null,
      }));
      setAllClients((current) =>
        current.map((client) =>
          client.id === endingClient.id
            ? { ...client, currentAssignment: null }
            : client,
        ),
      );
      setDetailState((current) =>
        current.status === "ready" && current.client.id === endingClient.id
          ? {
              ...current,
              assignment: null,
              client: {
                ...current.client,
                currentAssignment: null,
              },
            }
          : current,
      );
      if (shouldKeepDrawerState) {
        setAssignmentState((current) =>
          confirmClientAssignmentEnded(current, endingClient.id),
        );
      }
      setIsEndPlanOpen(false);
      notify.success("Plan finalizado");
    } catch (caughtError) {
      const message = getErrorMessage(caughtError);
      if (shouldKeepDrawerState) {
        setAssignmentState((current) => {
          if (current.clientId && current.clientId !== endingClient.id) {
            return current;
          }

          return {
            status: "error",
            clientId: endingClient.id,
            assignment:
              current.clientId === endingClient.id
                ? current.assignment
                : endingAssignment,
            error: message,
            requestId: null,
          };
        });
      } else {
        setError(message);
      }
    } finally {
      setIsEndingPlan(false);
    }
  }

  function invalidateDrawerAssignmentRequest() {
    assignmentRequestRef.current.invalidate();
    setAssignmentState(invalidateClientAssignmentLoad());
  }

  function handleDrawerCloseIntent(event: { target: EventTarget | null }) {
    if (
      event.target instanceof Element &&
      event.target.closest('button[aria-label="Cerrar detalle"]')
    ) {
      invalidateDrawerAssignmentRequest();
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
        assignment={actionAssignment}
        isEnding={isEndingPlan}
        isOpen={isEndPlanOpen}
        onConfirm={endCurrentPlanForSelectedClient}
        onOpenChange={setIsEndPlanOpen}
      />
      <ConfirmActionDialog
        confirmLabel="Archivar cliente"
        consequence="El cliente dejará de aparecer en la lista principal, pero su ficha e historial seguirán disponibles."
        description={archiveCandidate?.name ?? "Cliente seleccionado"}
        errorMessage={archiveError}
        isLoading={
          statusMutation.status === "pending" &&
          statusMutation.clientId === archiveCandidate?.id &&
          statusMutation.targetStatus === "archived"
        }
        open={isArchiveDialogOpen}
        title={
          archiveCandidate ? `Archivar ${archiveCandidate.name}` : "Archivar cliente"
        }
        onOpenChange={(nextOpen) => {
          setIsArchiveDialogOpen(nextOpen);
          if (!nextOpen) {
            setCurrentStatusMutation(
              clearClientStatusMutationError(statusMutationRef.current),
            );
            setArchiveCandidate(null);
          }
        }}
        onConfirm={async () => {
          if (!archiveCandidate) {
            return false;
          }

          return updateStatus(archiveCandidate.id, "archived");
        }}
      />
    </>
  );

  if (mode === "detail") {
    return (
      <WorkspaceFrame
        header={
          <WorkspaceHeader
            description={currentDetailClient?.mainGoal ?? "Datos operativos, acceso y plan actual del cliente."}
            title={currentDetailClient?.name ?? "Ficha de cliente"}
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
              {detailState.status === "error" || error ? (
                <ClientErrorCard
                  error={detailState.status === "error" ? detailState.error : error}
                />
              ) : null}

              {detailState.status === "loading" ? (
                <ClientDetailLoadingCard />
              ) : detailState.status === "ready" && currentDetailClient ? (
                <ClientDetail
                  assignment={currentDetailAssignment}
                  client={currentDetailClient}
                  isClientEditDisabled={isClientStatusMutationPending(
                    statusMutation,
                    currentDetailClient.id,
                  )}
                  isPlanLoading={false}
                  isStatusMutationPending={Boolean(pendingStatusClientId)}
                  pendingStatus={getPendingStatus(currentDetailClient.id)}
                  variant="page"
                  onArchiveStatusChange={openArchiveDialog}
                  onEndPlan={() => setIsEndPlanOpen(true)}
                  onEdit={openEditForm}
                  onStatusChange={updateStatus}
                />
              ) : detailState.status === "not-found" ? (
                <ClientNotFoundCard />
              ) : (
                null
              )}
            </div>
          }
          side={
            <div className="p-5">
              {currentDetailClient ? (
                <ClientQuickPanel
                  assignment={currentDetailAssignment}
                  client={currentDetailClient}
                  isEditDisabled={isClientStatusMutationPending(
                    statusMutation,
                    currentDetailClient.id,
                  )}
                  onEdit={() => openEditForm(currentDetailClient)}
                  onEndPlan={() => setIsEndPlanOpen(true)}
                />
              ) : detailState.status === "loading" ? (
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
                accessCount={operationalMetrics.accessCount}
                activeCount={operationalMetrics.activeCount}
                assignmentCount={operationalMetrics.assignmentCount}
                pausedInactiveCount={operationalMetrics.pausedInactiveCount}
                totalCount={operationalMetrics.totalCount}
              />
            )}
          </div>

          <ClientList
            assignmentsByClient={visibleAssignmentsByClient}
            clients={displayClients}
            error={error}
            isLoading={isInitialLoading}
            pendingStatusClientId={pendingStatusClientId}
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
        <div
          onClick={handleDrawerCloseIntent}
          onPointerDown={handleDrawerCloseIntent}
        >
          <DetailDrawer
            description="Ficha operativa, plan actual, acceso y notas del cliente seleccionado."
            open={isDetailSheetOpen}
            title="Detalle de cliente"
            onOpenChange={(open) => {
              if (!open) {
                invalidateDrawerAssignmentRequest();
              }
              setIsDetailSheetOpen(open);
            }}
          >
            <ClientDetail
              assignment={drawerAssignment}
              client={selectedClient}
              isClientEditDisabled={isClientStatusMutationPending(
                statusMutation,
                selectedClient.id,
              )}
              isPlanLoading={isDrawerPlanLoading}
              planError={drawerAssignmentError}
              isStatusMutationPending={Boolean(pendingStatusClientId)}
              pendingStatus={getPendingStatus(selectedClient.id)}
              onArchiveStatusChange={openArchiveDialog}
              onEndPlan={() => setIsEndPlanOpen(true)}
              onEdit={openEditForm}
              onStatusChange={updateStatus}
              onRetryPlan={() => {
                if (isDetailSheetOpen && selectedId === selectedClient.id) {
                  void loadCurrentPlanAssignment(selectedClient.id);
                }
              }}
            />
          </DetailDrawer>
        </div>
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
  isEditDisabled,
  onEdit,
  onEndPlan,
}: {
  assignment: CurrentPlanAssignment | null | undefined;
  client: Client;
  isEditDisabled: boolean;
  onEdit: () => void;
  onEndPlan: () => void;
}) {
  const hasPlan = Boolean(assignment?.assignedPlan);
  return (
    <WorkspacePanel title="Acciones rápidas" description="Operaciones frecuentes de esta ficha.">
      <div className="flex flex-col gap-2 p-4">
        <Button
          className="justify-start shadow-none"
          disabled={isEditDisabled}
          variant="outline"
          onClick={onEdit}
        >
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
