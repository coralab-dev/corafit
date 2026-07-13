"use client";

import {
  AlertTriangleIcon,
  ArrowRightIcon,
  CheckCircle2Icon,
  DumbbellIcon,
  InfoIcon,
  Loader2Icon,
  SearchIcon,
  ShieldCheckIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { WorkspaceFrame, WorkspaceHeader, WorkspacePanel, WorkspaceSplit } from "@/components/layout/workspace-shell";
import { useAuth } from "@/components/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authenticatedRequest } from "@/lib/api/authenticated-request";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import {
  getErrorMessage,
  initials,
  statusLabels,
} from "@/lib/clients/api";
import { fetchAllPages } from "@/lib/pagination";
import type {
  Client,
  ClientDetailResponse,
  CurrentPlanAssignment,
  PlansResponse,
  TrainingPlan,
} from "@/lib/clients/types";
import { AssignmentWeekPreview } from "./assignment-week-preview";
import {
  canConfirmAssignment,
  formatDateOnlyEs,
  getAssignmentEndDate,
  getFirstWeekRange,
  getLevelLabel,
  getPlanListFacts,
  getSortedWeeks,
  getWeekPreview,
  getWeekSessionCount,
  hasActiveAssignment,
  isClientAvailableForAssignment,
} from "./assign-plan-state";

export function AssignPlanWorkspace({ clientId }: { clientId: string }) {
  const router = useRouter();
  const { profile, session, status: authStatus } = useAuth();
  const organizationTimezone = profile?.organization?.timezone ?? "UTC";
  const defaultStartDate = useMemo(
    () => getTodayInTimeZone(organizationTimezone),
    [organizationTimezone],
  );
  const [client, setClient] = useState<Client | null>(null);
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [selectedPlanSummary, setSelectedPlanSummary] = useState<TrainingPlan | null>(null);
  const [selectedPlanDetail, setSelectedPlanDetail] = useState<TrainingPlan | null>(null);
  const [selectedWeekNumber, setSelectedWeekNumber] = useState<number | null>(null);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [startDateOverride, setStartDateOverride] = useState<string | null>(null);
  const [isLoadingClient, setIsLoadingClient] = useState(false);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [clientError, setClientError] = useState("");
  const [plansError, setPlansError] = useState("");
  const [previewError, setPreviewError] = useState("");
  const [assignmentError, setAssignmentError] = useState("");
  const previewRequestRef = useRef(0);

  const organizationId = profile?.organization?.id ?? null;
  const isApiReady = authStatus === "authenticated" && Boolean(session && organizationId);
  const startDate = startDateOverride ?? defaultStartDate;
  const selectedPlanId = selectedPlanSummary?.id ?? "";
  const activePlan = selectedPlanDetail ?? selectedPlanSummary;
  const hasClient = Boolean(client);
  const isClientBlocked = Boolean(client && hasActiveAssignment(client.currentAssignment));
  const selectedWeekPreview = selectedPlanDetail && selectedWeekNumber
    ? getWeekPreview(selectedPlanDetail, selectedWeekNumber, startDate)
    : null;
  const hasIncompletePlan = Boolean(
    selectedPlanDetail &&
      getSortedWeeks(selectedPlanDetail).every((week) =>
        (week.days ?? []).every((day) => !day.session),
      ),
  );
  const canAssign = Boolean(selectedPlanDetail) &&
    canConfirmAssignment({
      client,
      selectedPlanId,
      startDate,
      isPlanDetailLoading: isLoadingPreview,
      previewError,
      isAssigning,
    });

  const filteredPlans = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return plans;
    }

    return plans.filter((plan) =>
      [plan.name, plan.goal, plan.level]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(normalizedQuery)),
    );
  }, [plans, query]);

  const request = useCallback(
    <T,>(path: string, init: RequestInit = {}) =>
      authenticatedRequest<T>(path, init, { organizationId, session }),
    [organizationId, session],
  );

  const loadClient = useCallback(async () => {
    if (!isApiReady) {
      setClient(null);
      setClientError(
        authStatus === "loading"
          ? ""
          : "La sesión no está disponible. Inicia sesión de nuevo para asignar planes.",
      );
      return;
    }

    setIsLoadingClient(true);
    setClientError("");
    try {
      const [clientDetail, currentAssignment] = await Promise.all([
        request<ClientDetailResponse>(
          `/clients/${encodeURIComponent(clientId)}`,
          { method: "GET" },
        ),
        request<CurrentPlanAssignment | null>(
          `/clients/${encodeURIComponent(clientId)}/plan-assignment/current`,
          { method: "GET" },
        ),
      ]);
      setClient(createClientFromDetail(clientDetail, currentAssignment));
      if (hasActiveAssignment(currentAssignment)) {
        setClientError("El cliente ya tiene un plan activo. Finaliza el plan actual antes de asignar otro.");
      }
    } catch (caughtError) {
      setClient(null);
      setClientError(getErrorMessage(caughtError));
    } finally {
      setIsLoadingClient(false);
    }
  }, [authStatus, clientId, isApiReady, request]);

  const loadPlans = useCallback(async () => {
    if (!isApiReady) {
      setPlans([]);
      setPlansError(
        authStatus === "loading"
          ? ""
          : "La sesión no está disponible. Inicia sesión de nuevo para asignar planes.",
      );
      return;
    }

    setIsLoadingPlans(true);
    setPlansError("");
    try {
      const activePlans = await fetchAllPages({
        params: new URLSearchParams({ status: "active" }),
        fetchPage: (pageParams) =>
          request<PlansResponse>(
            `/training-plans?${pageParams.toString()}`,
            { method: "GET" },
          ),
      });
      setPlans(activePlans);
    } catch (caughtError) {
      setPlansError(getErrorMessage(caughtError));
    } finally {
      setIsLoadingPlans(false);
    }
  }, [authStatus, isApiReady, request]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadClient();
      void loadPlans();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadClient, loadPlans]);

  useEffect(() => {
    if (!selectedPlanSummary || !isApiReady) {
      return;
    }

    const requestId = previewRequestRef.current + 1;
    previewRequestRef.current = requestId;
    const controller = new AbortController();

    const timer = window.setTimeout(() => {
      setIsLoadingPreview(true);
      setPreviewError("");
      setSelectedPlanDetail(null);
      setSelectedWeekNumber(null);
      setSelectedDayKey(null);

      void request<TrainingPlan>(
        `/training-plans/${encodeURIComponent(selectedPlanSummary.id)}`,
        { method: "GET", signal: controller.signal },
      )
        .then((planDetail) => {
          if (previewRequestRef.current !== requestId) {
            return;
          }

          setSelectedPlanDetail(planDetail);
          const firstWeek = getSortedWeeks(planDetail)[0] ?? null;
          setSelectedWeekNumber(firstWeek?.weekNumber ?? null);
          setSelectedDayKey(null);
        })
        .catch((caughtError) => {
          if (controller.signal.aborted || previewRequestRef.current !== requestId) {
            return;
          }

          setPreviewError(getErrorMessage(caughtError));
        })
        .finally(() => {
          if (previewRequestRef.current === requestId) {
            setIsLoadingPreview(false);
          }
        });
    }, 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [isApiReady, request, selectedPlanSummary]);

  function selectPlan(plan: TrainingPlan) {
    setSelectedPlanSummary(plan);
    setSelectedPlanDetail(null);
    setSelectedWeekNumber(null);
    setSelectedDayKey(null);
    setPreviewError("");
    setAssignmentError("");
    setIsLoadingPreview(true);
  }

  function selectWeek(weekNumber: number) {
    setSelectedWeekNumber(weekNumber);
    const preview = selectedPlanDetail
      ? getWeekPreview(selectedPlanDetail, weekNumber, startDate)
      : null;
    setSelectedDayKey(
      preview?.days.find((day) => !day.isRest)?.key ?? preview?.days[0]?.key ?? null,
    );
  }

  async function assignPlan() {
    if (!canAssign || !client) {
      if (client && !isClientAvailableForAssignment(client)) {
        setAssignmentError("El cliente ya tiene un plan activo. Finaliza el plan actual antes de asignar otro.");
      }
      return;
    }

    setIsAssigning(true);
    setAssignmentError("");
    try {
      await request(
        `/clients/${client.id}/assign-plan`,
        {
          method: "POST",
          body: JSON.stringify({
            trainingPlanId: selectedPlanId,
            startDate,
          }),
        },
      );
      notify.success("Plan asignado");
      router.push(`/clients/${client.id}`);
    } catch (caughtError) {
      const message = getErrorMessage(caughtError);
      setAssignmentError(
        message.includes("ACTIVE_ASSIGNMENT_EXISTS")
          ? "El cliente ya tiene un plan activo. Finaliza el plan actual antes de asignar otro."
          : message,
      );
    } finally {
      setIsAssigning(false);
    }
  }

  const summary = (
    <AssignmentSummary
      clientId={clientId}
      isSubmitting={isAssigning}
      plan={activePlan}
      selectedWeekNumber={selectedWeekNumber}
      startDate={startDate}
      weekRange={selectedWeekPreview?.rangeLabel ?? getFirstWeekRange(selectedPlanDetail, startDate)}
      onAssign={assignPlan}
      canAssign={canAssign}
    />
  );

  return (
    <WorkspaceFrame
      header={
        <WorkspaceHeader
          description={`Configura el plan que recibirá ${client?.name ?? "Cliente"}.`}
          title="Asignar plan"
          actions={
            <Button asChild className="shadow-none" variant="outline">
              <Link href={`/clients/${clientId}`}>Volver al cliente</Link>
            </Button>
          }
        />
      }
    >
      <WorkspaceSplit
        main={
          <div className="flex min-w-0 flex-col gap-5 bg-background p-4 pb-28 md:p-6 xl:pb-6">
            {!hasClient ? (
              <ClientUnavailableState
                clientError={clientError}
                isLoadingClient={isLoadingClient}
              />
            ) : isClientBlocked ? (
              <>
                <ContextStrip
                  client={client}
                  isLoadingClient={isLoadingClient}
                  organizationTimezone={organizationTimezone}
                  startDate={startDate}
                  onStartDateChange={setStartDateOverride}
                />
                <ActiveAssignmentNotice client={client} clientId={clientId} />
              </>
            ) : (
              <>
                <ContextStrip
                  client={client}
                  isLoadingClient={isLoadingClient}
                  organizationTimezone={organizationTimezone}
                  startDate={startDate}
                  onStartDateChange={setStartDateOverride}
                />
                <ErrorBanner message={clientError} />

                <WorkspacePanel className="overflow-hidden">
                  <div className="border-b px-4 py-4 md:px-5">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <h2 className="text-base font-semibold">Seleccionar plan</h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {isLoadingPlans ? "Buscando planes..." : `${filteredPlans.length} planes`}
                        </p>
                      </div>
                      <div className="relative w-full lg:max-w-sm">
                        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          className="pl-10"
                          placeholder="Buscar por nombre, objetivo o nivel"
                          value={query}
                          onChange={(event) => setQuery(event.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-4 md:p-5">
                    <ErrorBanner message={plansError} />
                    {isLoadingPlans ? (
                      <LoadingPanel label="Cargando planes" />
                    ) : filteredPlans.length ? (
                      <div className="grid gap-3 lg:grid-cols-2">
                        {filteredPlans.map((plan) => (
                          <PlanOptionCard
                            key={plan.id}
                            isSelected={plan.id === selectedPlanSummary?.id}
                            plan={plan}
                            onSelect={() => selectPlan(plan)}
                          />
                        ))}
                      </div>
                    ) : (
                      <EmptyPanel
                        description="No hay planes activos que coincidan con la búsqueda."
                        title="Sin resultados"
                      />
                    )}
                  </div>
                </WorkspacePanel>

                <WorkspacePanel className="mt-1 p-4 md:p-5">
                  {isLoadingPreview ? (
                    <LoadingPanel label="Cargando vista previa" />
                  ) : previewError ? (
                    <ErrorBanner message={previewError} />
                  ) : selectedPlanDetail ? (
                    <>
                      {hasIncompletePlan ? (
                        <div className="mb-4 rounded-xl border border-amber-500/35 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200">
                          <AlertTriangleIcon className="mr-2 inline size-4 align-text-bottom" />
                          Este plan no tiene sesiones programadas. Puedes asignarlo, pero el cliente no verá entrenamientos hasta completarlo.
                        </div>
                      ) : null}
                      <AssignmentWeekPreview
                        plan={selectedPlanDetail}
                        selectedDayKey={selectedDayKey}
                        selectedWeekNumber={selectedWeekNumber}
                        startDate={startDate}
                        onSelectDay={setSelectedDayKey}
                        onSelectWeek={selectWeek}
                      />
                    </>
                  ) : (
                    <EmptyPanel
                      description="Selecciona un plan para cargar su calendario completo."
                      title="Sin vista previa"
                    />
                  )}
                </WorkspacePanel>

                <div className="xl:hidden">{summary}</div>
                <ErrorBanner message={assignmentError} />
              </>
            )}
          </div>
        }
        side={hasClient && !isClientBlocked ? <div className="hidden p-5 xl:block">{summary}</div> : undefined}
        sideClassName="xl:w-[380px] xl:min-w-[340px]"
      />
      {hasClient && !isClientBlocked ? <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 p-3 shadow-lg backdrop-blur xl:hidden">
        <Button className="w-full" disabled={!canAssign} onClick={assignPlan}>
          {isAssigning ? <Loader2Icon className="size-4 animate-spin" /> : null}
          Asignar plan
          {!isAssigning ? <ArrowRightIcon className="size-4" /> : null}
        </Button>
      </div> : null}
    </WorkspaceFrame>
  );
}

function PlanOptionCard({
  isSelected,
  plan,
  onSelect,
}: {
  isSelected: boolean;
  plan: TrainingPlan;
  onSelect: () => void;
}) {
  const facts = getPlanListFacts(plan);
  const Icon = plan.isSystemTemplate ? ShieldCheckIcon : DumbbellIcon;

  return (
    <button
      className={cn(
        "rounded-xl border border-transparent bg-background p-4 text-left shadow-[var(--surface-shadow-soft)] transition hover:border-primary/30",
        isSelected && "border-primary/45 bg-primary/5 shadow-[0_0_0_1px_var(--primary)]",
      )}
      type="button"
      onClick={onSelect}
    >
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <p className="line-clamp-1 text-sm font-semibold leading-snug">{facts.name}</p>
            <Badge variant="secondary">{facts.badge}</Badge>
          </div>
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{facts.goal}</p>
          <p className="mt-3 text-xs font-medium text-muted-foreground">
            {facts.level} · {facts.duration}
          </p>
        </div>
        <span
          className={cn(
            "mt-1 flex size-5 items-center justify-center rounded-full border",
            isSelected && "border-primary bg-primary text-primary-foreground",
          )}
        >
          {isSelected ? <CheckCircle2Icon className="size-3.5" /> : null}
        </span>
      </div>
    </button>
  );
}

function ContextStrip({
  client,
  isLoadingClient,
  organizationTimezone,
  startDate,
  onStartDateChange,
}: {
  client: Client | null;
  isLoadingClient: boolean;
  organizationTimezone: string;
  startDate: string;
  onStartDateChange: (value: string) => void;
}) {
  return (
    <section className="grid gap-4 rounded-2xl border border-transparent bg-card p-4 shadow-[var(--surface-shadow)] md:grid-cols-[minmax(0,1fr)_280px] md:items-center">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted font-semibold text-primary">
          {client ? initials(client.name) : isLoadingClient ? <Loader2Icon className="size-4 animate-spin" /> : "CL"}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{client?.name ?? "Cliente"}</p>
          <p className="mt-1 truncate text-sm text-muted-foreground">
            {client
              ? `${statusLabels[client.operationalStatus]} · ${client.mainGoal || "Sin objetivo"}`
              : "Cliente"}
          </p>
        </div>
      </div>
      <div className="grid gap-2">
        <label className="text-xs font-semibold uppercase text-muted-foreground" htmlFor="assignment-start-date">
          Fecha de inicio
        </label>
        <Input
          id="assignment-start-date"
          type="date"
          value={startDate}
          onChange={(event) => onStartDateChange(event.target.value)}
        />
        <p className="text-xs text-muted-foreground">{organizationTimezone}</p>
      </div>
    </section>
  );
}

function ActiveAssignmentNotice({
  client,
  clientId,
}: {
  client: Client | null;
  clientId: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-destructive/25 bg-destructive/10 p-4 text-sm text-destructive md:flex-row md:items-center md:justify-between">
      <div>
        <p className="font-semibold">
          {client?.name ? `${client.name} ya tiene un plan activo.` : "El cliente ya tiene un plan activo."}
        </p>
        <p className="mt-1 text-destructive/80">
          Finaliza el plan actual antes de asignar uno nuevo.
        </p>
      </div>
      <Button asChild className="shrink-0" variant="outline">
        <Link href={`/clients/${clientId}/plan-assignment/edit`}>Ver plan actual</Link>
      </Button>
    </div>
  );
}

function ClientUnavailableState({
  clientError,
  isLoadingClient,
}: {
  clientError: string;
  isLoadingClient: boolean;
}) {
  if (!clientError) {
    return (
      <div className="flex min-h-40 items-center justify-center rounded-2xl border border-transparent bg-card text-sm text-muted-foreground shadow-[var(--surface-shadow)]">
        {isLoadingClient ? <Loader2Icon className="mr-2 size-4 animate-spin" /> : null}
        Cargando cliente
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-destructive/25 bg-destructive/10 p-4 text-sm text-destructive shadow-[var(--surface-shadow)]">
      <p className="font-semibold">No se pudo cargar el cliente.</p>
      <p className="mt-1 text-destructive/80">
        {clientError || "Intenta volver al cliente y abrir la asignación otra vez."}
      </p>
    </div>
  );
}

function SummaryFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

function AssignmentSummary({
  canAssign,
  clientId,
  isSubmitting,
  plan,
  selectedWeekNumber,
  startDate,
  weekRange,
  onAssign,
}: {
  canAssign: boolean;
  clientId: string;
  isSubmitting: boolean;
  plan: TrainingPlan | null;
  selectedWeekNumber: number | null;
  startDate: string;
  weekRange: string | null | undefined;
  onAssign: () => void;
}) {
  return (
    <WorkspacePanel className="h-fit p-5 xl:sticky xl:top-8" title="Confirmar asignación">
      <div>
        {plan ? (
          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold">{plan.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {plan.isSystemTemplate ? "Plan base" : "Mi plan"} · {getLevelLabel(plan.level)}
              </p>
            </div>
            <dl className="space-y-3 border-t pt-4">
              <SummaryFact label="Inicio" value={formatDateOnlyEs(startDate) ?? "Sin fecha"} />
              <SummaryFact
                label="Final"
                value={formatDateOnlyEs(getAssignmentEndDate(plan, startDate)) ?? "Sin fecha"}
              />
              <SummaryFact label="Duración" value={`${plan.durationWeeks} semanas`} />
              <SummaryFact
                label={`Sesiones semana ${selectedWeekNumber ?? 1}`}
                value={`${getWeekSessionCount(plan, selectedWeekNumber)}`}
              />
            </dl>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Selecciona un plan.</p>
        )}
      </div>

      {weekRange ? (
        <p className="mt-4 rounded-xl bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          Semana {selectedWeekNumber ?? 1}: {weekRange}
        </p>
      ) : null}

      <div className="mt-5 rounded-xl bg-primary/5 p-3 text-sm text-primary">
        <InfoIcon className="mr-2 inline size-4 align-text-bottom" />
        Se creará una copia editable.
      </div>

      <div className="mt-5 hidden flex-col gap-3 xl:flex">
        <Button disabled={!canAssign} onClick={onAssign}>
          {isSubmitting ? <Loader2Icon className="size-4 animate-spin" /> : null}
          Asignar plan
          {!isSubmitting ? <ArrowRightIcon className="size-4" /> : null}
        </Button>
        <Button asChild variant="outline">
          <Link href={`/clients/${clientId}`}>Cancelar</Link>
        </Button>
      </div>
    </WorkspacePanel>
  );
}

function LoadingPanel({ label }: { label: string }) {
  return (
    <div className="flex min-h-32 items-center justify-center rounded-md border bg-background text-sm text-muted-foreground">
      <Loader2Icon className="mr-2 size-4 animate-spin" />
      {label}
    </div>
  );
}

function EmptyPanel({ description, title }: { description: string; title: string }) {
  return (
    <div className="rounded-md border bg-background p-6 text-center">
      <p className="font-semibold">{title}</p>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  if (!message) {
    return null;
  }

  return (
    <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
      {message}
    </div>
  );
}

function createClientFromDetail(
  detail: ClientDetailResponse,
  currentAssignment: CurrentPlanAssignment | null,
): Client {
  return {
    ...detail,
    phone: detail.phone ?? "",
    age: detail.age ?? 18,
    sex: detail.sex ?? "",
    trainingLevel: detail.trainingLevel ?? "",
    injuriesNotes: detail.injuriesNotes ?? "",
    generalNotes: detail.generalNotes ?? "",
    access: { status: "none" },
    currentAssignment: hasActiveAssignment(currentAssignment) ? currentAssignment : null,
  };
}

function getTodayInTimeZone(timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${values.year}-${values.month}-${values.day}`;
}
