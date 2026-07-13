"use client";

import {
  AlertTriangleIcon,
  ArrowRightIcon,
  CalendarDaysIcon,
  CheckCircle2Icon,
  DumbbellIcon,
  InfoIcon,
  Loader2Icon,
  SearchIcon,
  ShieldCheckIcon,
  UserRoundIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { WorkspaceFrame, WorkspaceHeader, WorkspacePanel, WorkspaceSplit } from "@/components/layout/workspace-shell";
import { useAuth } from "@/components/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import {
  apiRequest,
  formatDate,
  getErrorMessage,
  getInitialApiConfig,
  initials,
  statusLabels,
} from "@/lib/clients/api";
import { fetchAllPages } from "@/lib/pagination";
import type {
  ApiConfig,
  Client,
  ClientDetailResponse,
  CurrentPlanAssignment,
  PlansResponse,
  TrainingPlan,
} from "@/lib/clients/types";
import { AssignmentWeekPreview } from "./assignment-week-preview";
import {
  canConfirmAssignment,
  getAssignmentEndDate,
  getFirstWeekRange,
  getPlanListFacts,
  getSortedWeeks,
  getWeekPreview,
  getWeekSessionCount,
  isClientAvailableForAssignment,
} from "./assign-plan-state";

export function AssignPlanWorkspace({ clientId }: { clientId: string }) {
  const router = useRouter();
  const { profile } = useAuth();
  const organizationTimezone = profile?.organization?.timezone ?? "UTC";
  const defaultStartDate = useMemo(
    () => getTodayInTimeZone(organizationTimezone),
    [organizationTimezone],
  );
  const [apiConfig] = useState<ApiConfig>(getInitialApiConfig);
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

  const isApiReady = Boolean(apiConfig.bearerToken.trim() && apiConfig.organizationId.trim());
  const startDate = startDateOverride ?? defaultStartDate;
  const selectedPlanId = selectedPlanSummary?.id ?? "";
  const activePlan = selectedPlanDetail ?? selectedPlanSummary;
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

  const loadClient = useCallback(async () => {
    if (!isApiReady) {
      setClientError("Configura el JWT del coach y la organizacion para leer clientes reales.");
      return;
    }

    setIsLoadingClient(true);
    setClientError("");
    try {
      const [clientDetail, currentAssignment] = await Promise.all([
        apiRequest<ClientDetailResponse>(
          `/clients/${encodeURIComponent(clientId)}`,
          { method: "GET" },
          apiConfig,
        ),
        apiRequest<CurrentPlanAssignment | null>(
          `/clients/${encodeURIComponent(clientId)}/plan-assignment/current`,
          { method: "GET" },
          apiConfig,
        ),
      ]);
      setClient(createClientFromDetail(clientDetail, currentAssignment));
      if (currentAssignment?.assignment.status === "active") {
        setClientError("El cliente ya tiene un plan activo. Finaliza el plan actual antes de asignar otro.");
      }
    } catch (caughtError) {
      setClient(null);
      setClientError(getErrorMessage(caughtError));
    } finally {
      setIsLoadingClient(false);
    }
  }, [apiConfig, clientId, isApiReady]);

  const loadPlans = useCallback(async () => {
    if (!isApiReady) {
      setPlansError("Configura la conexion al API para asignar planes reales.");
      return;
    }

    setIsLoadingPlans(true);
    setPlansError("");
    try {
      const activePlans = await fetchAllPages({
        params: new URLSearchParams({ status: "active" }),
        fetchPage: (pageParams) =>
          apiRequest<PlansResponse>(
            `/training-plans?${pageParams.toString()}`,
            { method: "GET" },
            apiConfig,
          ),
      });
      setPlans(activePlans);
    } catch (caughtError) {
      setPlansError(getErrorMessage(caughtError));
    } finally {
      setIsLoadingPlans(false);
    }
  }, [apiConfig, isApiReady]);

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

      void apiRequest<TrainingPlan>(
        `/training-plans/${encodeURIComponent(selectedPlanSummary.id)}`,
        { method: "GET", signal: controller.signal },
        apiConfig,
      )
        .then((planDetail) => {
          if (previewRequestRef.current !== requestId) {
            return;
          }

          setSelectedPlanDetail(planDetail);
          const firstWeek = getSortedWeeks(planDetail)[0] ?? null;
          setSelectedWeekNumber(firstWeek?.weekNumber ?? null);
          const firstPreview = firstWeek
            ? getWeekPreview(planDetail, firstWeek.weekNumber, startDate)
            : null;
          setSelectedDayKey(
            firstPreview?.days.find((day) => !day.isRest)?.key ??
              firstPreview?.days[0]?.key ??
              null,
          );
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
  }, [apiConfig, isApiReady, selectedPlanSummary, startDate]);

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
      await apiRequest(
        `/clients/${client.id}/assign-plan`,
        {
          method: "POST",
          body: JSON.stringify({
            trainingPlanId: selectedPlanId,
            startDate,
          }),
        },
        apiConfig,
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
      client={client}
      isClientBlocked={Boolean(client && !isClientAvailableForAssignment(client))}
      isLoadingClient={isLoadingClient}
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
          description={`Configura el plan que recibirá ${client?.name ?? "Juan Pérez"}.`}
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
            <ErrorBanner message={clientError} />

            <WorkspacePanel className="overflow-hidden">
              <div className="border-b p-4 md:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <SectionHeading
                    description="Elige una plantilla activa para crear la copia editable del cliente."
                    title="Seleccionar plan"
                  />
                  <p className="text-sm text-muted-foreground">
                    {isLoadingPlans ? "Buscando planes..." : `${filteredPlans.length} resultados`}
                  </p>
                </div>
                <div className="relative mt-4">
                  <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-10"
                    placeholder="Buscar por nombre, objetivo o nivel"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </div>
              </div>

              <div className="p-4 md:p-5">
                <ErrorBanner message={plansError} />
                {isLoadingPlans ? (
                  <LoadingPanel label="Cargando planes" />
                ) : filteredPlans.length ? (
                  <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
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
                    description="No hay planes activos que coincidan con la busqueda."
                    title="Sin resultados"
                  />
                )}
              </div>
            </WorkspacePanel>

            <WorkspacePanel className="p-4 md:p-5">
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_280px] md:items-center">
                <SectionHeading
                  description="Se inicializa con el dia actual de la organizacion y puede modificarse."
                  title="Fecha de inicio"
                />
                <div>
                  <Input
                    aria-label="Fecha de inicio"
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDateOverride(event.target.value)}
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    Zona horaria: {organizationTimezone}
                  </p>
                </div>
              </div>
            </WorkspacePanel>

            <WorkspacePanel className="p-4 md:p-5">
              {isLoadingPreview ? (
                <LoadingPanel label="Cargando vista previa" />
              ) : previewError ? (
                <ErrorBanner message={previewError} />
              ) : selectedPlanDetail ? (
                <>
                  {hasIncompletePlan ? (
                    <div className="mb-4 rounded-md border border-amber-500/35 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200">
                      <AlertTriangleIcon className="mr-2 inline size-4 align-text-bottom" />
                      Este plan no tiene sesiones programadas. Puedes asignarlo, pero el cliente no vera entrenamientos hasta completarlo.
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
          </div>
        }
        side={<div className="hidden p-5 xl:block">{summary}</div>}
        sideClassName="xl:w-[380px] xl:min-w-[340px]"
      />
      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 p-3 shadow-lg backdrop-blur xl:hidden">
        <Button className="w-full" disabled={!canAssign} onClick={assignPlan}>
          {isAssigning ? <Loader2Icon className="size-4 animate-spin" /> : null}
          Asignar plan
          {!isAssigning ? <ArrowRightIcon className="size-4" /> : null}
        </Button>
      </div>
    </WorkspaceFrame>
  );
}

function SectionHeading({ description, title }: { description: string; title: string }) {
  return (
    <div>
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
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
        "min-h-40 rounded-md border bg-background p-4 text-left transition hover:border-primary/50",
        isSelected && "border-primary bg-primary/5 shadow-[0_0_0_1px_var(--primary)]",
      )}
      type="button"
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex size-9 items-center justify-center rounded-md border text-primary">
          <Icon className="size-4" />
        </span>
        {isSelected ? (
          <span className="flex items-center gap-1 text-xs font-semibold text-primary">
            <CheckCircle2Icon className="size-4" />
            Seleccionado
          </span>
        ) : null}
      </div>
      <div className="mt-4 min-w-0">
        <p className="line-clamp-2 text-sm font-semibold leading-snug">{facts.name}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge variant="secondary">{facts.badge}</Badge>
          <Badge variant="outline">{facts.level}</Badge>
        </div>
      </div>
      <dl className="mt-4 grid gap-2 border-t pt-3 text-[13px]">
        <FactBlock label="Objetivo" value={facts.goal} />
        <FactRow label="Duracion" value={facts.duration} />
      </dl>
    </button>
  );
}

function AssignmentSummary({
  canAssign,
  client,
  isClientBlocked,
  isLoadingClient,
  isSubmitting,
  plan,
  selectedWeekNumber,
  startDate,
  weekRange,
  onAssign,
}: {
  canAssign: boolean;
  client: Client | null;
  isClientBlocked: boolean;
  isLoadingClient: boolean;
  isSubmitting: boolean;
  plan: TrainingPlan | null;
  selectedWeekNumber: number | null;
  startDate: string;
  weekRange: string | null | undefined;
  onAssign: () => void;
}) {
  return (
    <WorkspacePanel className="h-fit p-5 xl:sticky xl:top-8" title="Resumen de asignacion">
      <SummarySection icon={<UserRoundIcon className="size-4" />} title="Cliente">
        {isLoadingClient ? (
          <LoadingInline label="Cargando cliente" />
        ) : client ? (
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-muted font-semibold text-primary">
              {initials(client.name)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{client.name}</p>
              <p className="text-xs text-muted-foreground">{statusLabels[client.operationalStatus]}</p>
              {client.mainGoal ? (
                <p className="mt-1 text-xs text-muted-foreground">{client.mainGoal}</p>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Sin cliente</p>
        )}
        {isClientBlocked ? (
          <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            El cliente ya tiene un plan activo. Finaliza el plan actual antes de asignar otro.
          </div>
        ) : null}
      </SummarySection>

      <SummarySection icon={<DumbbellIcon className="size-4" />} title="Plan">
        {plan ? (
          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold">{plan.name}</p>
              <Badge className="mt-2" variant="secondary">
                {plan.isSystemTemplate ? "Plan base" : "Mi plan"}
              </Badge>
            </div>
            <FactRow label="Nivel" value={plan.level ?? "Sin nivel"} />
            <FactRow label="Duracion" value={`${plan.durationWeeks} semanas`} />
            <FactRow
              label="Semana"
              value={`${getWeekSessionCount(plan, selectedWeekNumber)} sesiones`}
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Selecciona un plan.</p>
        )}
      </SummarySection>

      <SummarySection icon={<CalendarDaysIcon className="size-4" />} title="Calendario">
        <div className="space-y-3">
          <FactRow label="Inicio" value={formatDate(startDate) ?? "Sin fecha"} />
          <FactRow
            label="Final"
            value={formatDate(getAssignmentEndDate(plan, startDate)) ?? "Sin fecha"}
          />
          <FactRow
            label="Duracion total"
            value={plan ? `${plan.durationWeeks * 7} dias` : "Sin plan"}
          />
          <FactRow label="Primera semana" value={weekRange ?? "Sin rango"} />
        </div>
      </SummarySection>

      <div className="mt-5 rounded-md border bg-primary/5 p-3 text-sm text-primary">
        <InfoIcon className="mr-2 inline size-4 align-text-bottom" />
        Se creara una copia editable. Los cambios no modificaran el plan original.
      </div>

      <div className="mt-5 hidden flex-col gap-3 xl:flex">
        <Button disabled={!canAssign} onClick={onAssign}>
          {isSubmitting ? <Loader2Icon className="size-4 animate-spin" /> : null}
          Asignar plan
          {!isSubmitting ? <ArrowRightIcon className="size-4" /> : null}
        </Button>
      </div>
    </WorkspacePanel>
  );
}

function SummarySection({
  children,
  icon,
  title,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <section className="border-b py-5 first:pt-0 last:border-b-0">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <span className="flex size-7 items-center justify-center rounded-md bg-muted text-muted-foreground">
          {icon}
        </span>
        {title}
      </div>
      {children}
    </section>
  );
}

function FactBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-1 line-clamp-3 min-w-0 break-words font-medium leading-snug [overflow-wrap:anywhere]">
        {value}
      </dd>
    </div>
  );
}

function FactRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[112px_minmax(0,1fr)] items-start gap-2 text-sm">
      <dt className="min-w-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-right font-medium leading-snug [overflow-wrap:anywhere]">
        {value}
      </dd>
    </div>
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

function LoadingInline({ label }: { label: string }) {
  return (
    <div className="flex items-center text-sm text-muted-foreground">
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
    currentAssignment,
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
