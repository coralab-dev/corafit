"use client";

import {
  ArrowRightIcon,
  CheckCircle2Icon,
  DumbbellIcon,
  InfoIcon,
  Loader2Icon,
  SearchIcon,
  ShieldCheckIcon,
  ZapIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { notify } from "@/lib/notify";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WorkspaceFrame, WorkspaceHeader, WorkspacePanel, WorkspaceSplit } from "@/components/layout/workspace-shell";
import {
  canSubmitPlanAssignment,
  isClientAvailableForAssignment,
} from "@/app/training-plans/assign-plan-state";
import { cn } from "@/lib/utils";
import {
  apiRequest,
  countWeekSessions,
  dayLabels,
  formatDate,
  getErrorMessage,
  getInitialApiConfig,
  initials,
  levelLabels,
  statusLabels,
} from "@/lib/clients/api";
import { fetchAllPages } from "@/lib/pagination";
import type {
  ApiConfig,
  Client,
  ClientsResponse,
  DayOfWeek,
  PlansResponse,
  TrainingPlan,
  TrainingPlanDay,
} from "@/lib/clients/types";

const dayOrder: DayOfWeek[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const planIcons = [DumbbellIcon, ShieldCheckIcon, ZapIcon];

export function AssignPlanWorkspace({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [apiConfig] = useState<ApiConfig>(getInitialApiConfig);
  const [client, setClient] = useState<Client | null>(null);
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [previewPlan, setPreviewPlan] = useState<TrainingPlan | null>(null);
  const [query, setQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [isLoadingClient, setIsLoadingClient] = useState(false);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [error, setError] = useState("");
  const [previewError, setPreviewError] = useState("");

  const isApiReady = Boolean(apiConfig.bearerToken.trim() && apiConfig.organizationId.trim());
  const selectedPlan = previewPlan ?? plans.find((plan) => plan.id === selectedPlanId) ?? null;
  const isClientBlockedForAssignment =
    client !== null && !isClientAvailableForAssignment(client);
  const filteredPlans = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return plans;
    }

    return plans.filter((plan) =>
      [plan.name, plan.goal, plan.level, plan.generalNotes]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(normalizedQuery)),
    );
  }, [plans, query]);

  const loadClient = useCallback(async () => {
    if (!isApiReady) {
      setError("Configura el JWT del coach y la organizacion para leer clientes reales.");
      return;
    }

    setIsLoadingClient(true);
    setError("");
    try {
      const clients = await fetchAllPages({
        fetchPage: (pageParams) =>
          apiRequest<ClientsResponse>(
            `/clients?${pageParams.toString()}`,
            { method: "GET" },
            apiConfig,
          ),
      });
      const matchedClient = clients.find((item) => item.id === clientId);
      setClient(matchedClient ? { ...matchedClient, access: { status: "none" } } : null);
      if (!matchedClient) {
        setError("No se encontro el cliente solicitado.");
      } else if (!isClientAvailableForAssignment(matchedClient)) {
        setError("El cliente ya tiene un plan activo. Finaliza el plan actual antes de asignar otro.");
      }
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setIsLoadingClient(false);
    }
  }, [apiConfig, clientId, isApiReady]);

  const loadPlans = useCallback(async () => {
    if (!isApiReady) {
      setError("Configura la conexion al API para asignar planes reales.");
      return;
    }

    setIsLoadingPlans(true);
    setError("");
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
      setSelectedPlanId(activePlans[0]?.id ?? "");
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
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
    if (!selectedPlanId || !isApiReady) {
      return;
    }

    const timer = window.setTimeout(() => {
      setIsLoadingPreview(true);
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
        .finally(() => setIsLoadingPreview(false));
    }, 0);

    return () => window.clearTimeout(timer);
  }, [apiConfig, isApiReady, selectedPlanId]);

  async function assignPlan() {
    if (!client || !canSubmitPlanAssignment(client, selectedPlanId)) {
      if (client && isClientBlockedForAssignment) {
        setError("El cliente ya tiene un plan activo. Finaliza el plan actual antes de asignar otro.");
      }
      return;
    }

    setIsAssigning(true);
    setError("");
    try {
      await apiRequest(
        `/clients/${client.id}/assign-plan`,
        {
          method: "POST",
          body: JSON.stringify({
            trainingPlanId: selectedPlanId,
            ...(startDate ? { startDate } : {}),
          }),
        },
        apiConfig,
      );
      notify.success("Plan asignado");
      router.push(`/clients/${client.id}`);
    } catch (caughtError) {
      const message = getErrorMessage(caughtError);
      setError(
        message.includes("ACTIVE_ASSIGNMENT_EXISTS")
          ? "El cliente ya tiene un plan activo. Finaliza el plan actual antes de asignar otro."
          : message,
      );
    } finally {
      setIsAssigning(false);
    }
  }

  return (
    <WorkspaceFrame
      header={
        <WorkspaceHeader
          description={`${client?.name ?? "Cliente"} / ${selectedPlan?.name ?? "Sin plan seleccionado"}`}
          title="Asignar plan"
          actions={
            <Button asChild className="shadow-none" variant="outline">
              <Link href={`/clients/${clientId}`}>Volver a ficha</Link>
            </Button>
          }
        />
      }
    >
      <WorkspaceSplit
        main={
        <div className="flex min-w-0 flex-col gap-5 bg-background p-6">
          {error ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <WorkspacePanel className="p-5">
            <SectionHeading
              description="Elige una plantilla de plan para asignar a tu cliente."
              index="1"
              title="Seleccionar plan"
            />
            <div className="relative mt-4">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-10"
                placeholder="Buscar plantilla de plan..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>

            {isLoadingPlans ? (
              <LoadingPanel label="Cargando plantillas" />
            ) : filteredPlans.length ? (
              <div className="mt-4 grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
                {filteredPlans.map((plan, index) => (
                  <PlanOptionCard
                    key={plan.id}
                    iconIndex={index}
                    isSelected={plan.id === selectedPlanId}
                    plan={plan}
                    onSelect={() => {
                      setSelectedPlanId(plan.id);
                      setPreviewPlan(null);
                    }}
                  />
                ))}
              </div>
            ) : (
              <EmptyPanel
                description="No hay templates activos que coincidan con la busqueda."
                title="Sin templates activos"
              />
            )}
          </WorkspacePanel>

          <WorkspacePanel className="p-5">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_280px] md:items-center">
              <SectionHeading
                description="Selecciona la fecha en la que comenzara el plan."
                index="2"
                title="Fecha de inicio"
              />
              <div className="relative">
                <style>{`
                  .assignment-date-input::-webkit-calendar-picker-indicator {
                    cursor: pointer;
                    position: absolute;
                    left: 0.75rem;
                    margin: 0;
                  }
                `}</style>
                <Input
                  className="assignment-date-input relative pl-10"
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                />
              </div>
            </div>
          </WorkspacePanel>

          <WorkspacePanel className="p-5">
            <SectionHeading
              description="Asi se vera la estructura semanal del plan asignado."
              index="3"
              title="Vista previa semanal"
            />
            {isLoadingPreview ? (
              <LoadingPanel label="Cargando vista previa" />
            ) : previewError ? (
              <div className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                {previewError}
              </div>
            ) : selectedPlan ? (
              <WeeklyPreview plan={selectedPlan} />
            ) : (
              <EmptyPanel
                description="Selecciona una plantilla para ver su semana base."
                title="Sin vista previa"
              />
            )}
          </WorkspacePanel>

          <div className="rounded-md border bg-card p-4 text-sm text-muted-foreground">
            <InfoIcon className="mr-2 inline size-4 align-text-bottom" />
            Se creara una copia editable. El plan original no se modificara.
          </div>
        </div>
        }
        side={
        <div className="p-5">
          <AssignmentSummary
          client={client}
          isLoadingClient={isLoadingClient}
          isClientBlocked={isClientBlockedForAssignment}
          isSubmitting={isAssigning}
          plan={selectedPlan}
          startDate={startDate}
          onAssign={assignPlan}
          />
        </div>
        }
      />
    </WorkspaceFrame>
  );
}

function SectionHeading({
  description,
  index,
  title,
}: {
  description: string;
  index: string;
  title: string;
}) {
  return (
    <div>
      <h2 className="text-base font-semibold">
        {index}. {title}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function PlanOptionCard({
  iconIndex,
  isSelected,
  plan,
  onSelect,
}: {
  iconIndex: number;
  isSelected: boolean;
  plan: TrainingPlan;
  onSelect: () => void;
}) {
  const Icon = planIcons[iconIndex % planIcons.length] ?? DumbbellIcon;

  return (
    <button
      className={cn(
        "min-h-44 rounded-md border bg-background p-4 text-left transition hover:border-primary/50",
        isSelected && "border-primary bg-primary/5 shadow-[0_0_0_1px_var(--primary)]",
      )}
      type="button"
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex size-10 items-center justify-center rounded-md border text-primary">
          <Icon className="size-5" />
        </span>
        {isSelected ? (
          <span className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <CheckCircle2Icon className="size-4" />
          </span>
        ) : null}
      </div>
      <div className="mt-4 min-w-0">
        <p className="line-clamp-2 text-sm font-semibold leading-snug">{plan.name}</p>
        <Badge className="mt-2" variant="secondary">
          Template
        </Badge>
      </div>
      <PlanFacts className="mt-3 border-t pt-3" plan={plan} />
    </button>
  );
}

function PlanFacts({ className, plan }: { className?: string; plan: TrainingPlan }) {
  const week = getFirstWeek(plan);
  const sessions = week ? countWeekSessions(week) : 0;

  return (
    <dl className={cn("grid gap-1.5 text-[13px]", className)}>
      <FactBlock label="Objetivo" value={plan.goal ?? "Sin objetivo"} />
      <FactRow
        label="Nivel"
        value={plan.level ? levelLabels[plan.level] ?? plan.level : "Sin nivel"}
      />
      <FactRow label="Duracion" value={`${plan.durationWeeks} semanas`} />
      <FactRow label="Sesiones/semana" value={sessions ? `${sessions} dias` : "Sin sesiones"} />
    </dl>
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
    <div className="grid grid-cols-[108px_minmax(0,1fr)] items-start gap-2">
      <dt className="min-w-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-right font-medium leading-snug [overflow-wrap:anywhere]">
        {value}
      </dd>
    </div>
  );
}

function WeeklyPreview({ plan }: { plan: TrainingPlan }) {
  const week = getFirstWeek(plan);
  const daysByName = new Map((week?.days ?? []).map((day) => [day.dayOfWeek, day]));

  if (!week) {
    return (
      <EmptyPanel
        description="Este plan no tiene semanas cargadas todavia."
        title="Plan sin estructura"
      />
    );
  }

  return (
    <div className="mt-4 grid overflow-hidden rounded-md border bg-background md:grid-cols-7">
      {dayOrder.map((day) => (
        <PreviewDay key={day} day={daysByName.get(day)} dayOfWeek={day} />
      ))}
    </div>
  );
}

function PreviewDay({
  day,
  dayOfWeek,
}: {
  day: TrainingPlanDay | undefined;
  dayOfWeek: DayOfWeek;
}) {
  const isRest = !day?.session;

  return (
    <div className="flex min-h-32 flex-col items-center justify-between gap-3 border-b p-4 text-center last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0">
      <p className="text-xs font-medium uppercase text-muted-foreground">
        {dayLabels[dayOfWeek].slice(0, 3)}
      </p>
      <span
        className={cn(
          "flex size-10 items-center justify-center rounded-md border",
          isRest ? "text-muted-foreground" : "text-primary",
        )}
      >
        {isRest ? <span className="h-px w-4 bg-current" /> : <DumbbellIcon className="size-5" />}
      </span>
      <div className="min-h-12">
        <p className="line-clamp-2 text-sm font-medium">
          {day?.session?.name ?? "Descanso"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {day?.session ? `Sesion ${day.dayOrder ?? "-"}` : "-"}
        </p>
      </div>
    </div>
  );
}

function AssignmentSummary({
  client,
  isLoadingClient,
  isClientBlocked,
  isSubmitting,
  plan,
  startDate,
  onAssign,
}: {
  client: Client | null;
  isLoadingClient: boolean;
  isClientBlocked: boolean;
  isSubmitting: boolean;
  plan: TrainingPlan | null;
  startDate: string;
  onAssign: () => void;
}) {
  return (
    <WorkspacePanel className="h-fit p-5 xl:sticky xl:top-8" title="Resumen de asignacion">
      <div className="mt-6">
        <p className="mb-3 text-sm text-muted-foreground">Cliente</p>
        {isLoadingClient ? (
          <LoadingInline label="Cargando cliente" />
        ) : client ? (
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-full bg-muted font-semibold text-primary">
              {initials(client.name)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{client.name}</p>
              <p className="text-xs text-muted-foreground">{statusLabels[client.operationalStatus]}</p>
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
      </div>

      <div className="mt-6 border-t pt-6">
        <p className="mb-3 text-sm text-muted-foreground">Plan seleccionado</p>
        {plan ? (
          <>
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-md border text-primary">
                <DumbbellIcon className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{plan.name}</p>
                <Badge className="mt-1" variant="secondary">
                  Template
                </Badge>
              </div>
            </div>
            <PlanFacts className="mt-5" plan={plan} />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Selecciona una plantilla.</p>
        )}
      </div>

      <div className="mt-6 border-t pt-6">
        <FactRow label="Fecha de inicio" value={formatDate(startDate) ?? "Sin fecha"} />
        <div className="mt-4">
          <FactRow label="Duracion estimada" value={getEstimatedEndDate(plan, startDate)} />
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <Button disabled={!client || !plan || isSubmitting || isClientBlocked} onClick={onAssign}>
          {isSubmitting ? <Loader2Icon data-icon="inline-start" className="animate-spin" /> : null}
          Asignar plan
          {!isSubmitting ? <ArrowRightIcon data-icon="inline-end" /> : null}
        </Button>
        <Button asChild variant="outline">
          <Link href={client ? `/clients/${client.id}` : "/clients"}>Cancelar</Link>
        </Button>
      </div>
    </WorkspacePanel>
  );
}

function LoadingPanel({ label }: { label: string }) {
  return (
    <div className="mt-4 flex min-h-32 items-center justify-center rounded-md border bg-background text-sm text-muted-foreground">
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
    <div className="mt-4 rounded-md border bg-background p-6 text-center">
      <p className="font-semibold">{title}</p>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function getFirstWeek(plan: TrainingPlan) {
  return [...(plan.weeks ?? [])].sort((first, second) => first.weekNumber - second.weekNumber)[0];
}

function getEstimatedEndDate(plan: TrainingPlan | null, startDate: string) {
  if (!plan || !startDate) {
    return "Sin fecha";
  }

  const date = new Date(startDate);
  date.setDate(date.getDate() + plan.durationWeeks * 7);

  return formatDate(date.toISOString()) ?? "Sin fecha";
}
