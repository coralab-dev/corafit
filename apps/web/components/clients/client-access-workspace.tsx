"use client";

import {
  AlertTriangleIcon,
  ActivityIcon,
  ArrowLeftIcon,
  CheckCircle2Icon,
  ClipboardIcon,
  Clock3Icon,
  KeyRoundIcon,
  Loader2Icon,
  LockKeyholeIcon,
  RefreshCwIcon,
  ShieldOffIcon,
  SparklesIcon,
  UserRoundIcon,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { ConfirmActionDialog } from "@/components/shared/confirm-action-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  WorkspaceFrame,
  WorkspaceHeader,
  WorkspacePanel,
} from "@/components/layout/workspace-shell";
import { authenticatedRequest } from "@/lib/api/authenticated-request";
import { formatDate, getErrorMessage, initials, statusLabels, typeLabels } from "@/lib/clients/api";
import type { Client, ClientAccess, CurrentPlanAssignment } from "@/lib/clients/types";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import {
  buildAccessViewState,
  getPlanSummary,
  markAccessDisabled,
  markAccessGenerated,
  type AccessMutationResponse,
  type GeneratedAccess,
  type PendingAccessAction,
} from "./client-access-state";
import { ClientErrorCard, ClientNotFoundCard } from "./workspace-panels";

type ConfirmationTarget = "regenerate" | "disable" | null;

export function ClientAccessWorkspace({ clientId }: { clientId: string }) {
  const { profile, session, status: authStatus } = useAuth();
  const [client, setClient] = useState<Client | null>(null);
  const [assignment, setAssignment] = useState<CurrentPlanAssignment | null>(null);
  const [planLoadError, setPlanLoadError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [isRequestLoading, setIsRequestLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAccessAction>(null);
  const [generatedAccess, setGeneratedAccess] = useState<GeneratedAccess | null>(null);
  const [confirmationTarget, setConfirmationTarget] = useState<ConfirmationTarget>(null);
  const [confirmationError, setConfirmationError] = useState("");

  const organizationId = profile?.organization?.id ?? null;
  const isApiReady = authStatus === "authenticated" && Boolean(session && organizationId);
  const isInitialLoading = authStatus === "loading" || (isRequestLoading && !hasLoaded);
  const isRefreshing = isRequestLoading && hasLoaded;

  const request = useCallback(
    <T,>(path: string, init: RequestInit = {}) =>
      authenticatedRequest<T>(path, init, { organizationId, session }),
    [organizationId, session],
  );

  const loadAccessScreen = useCallback(async () => {
    if (!isApiReady) {
      setClient(null);
      setAssignment(null);
      setPlanLoadError("");
      setLoadError(
        authStatus === "loading"
          ? ""
          : "La sesion no esta disponible. Inicia sesion de nuevo para gestionar este acceso.",
      );
      setHasLoaded(false);
      return;
    }

    setIsRequestLoading(true);
    setLoadError("");
    setPlanLoadError("");

    try {
      const [selectedClient, access] = await Promise.all([
        request<Omit<Client, "access">>(`/clients/${clientId}`, { method: "GET" }),
        request<ClientAccess | null>(`/clients/${clientId}/access`, { method: "GET" }),
      ]);

      const normalizedAccess = normalizeAccess(access);
      setClient({ ...selectedClient, access: normalizedAccess });
      setHasLoaded(true);

      try {
        const currentAssignment = await request<CurrentPlanAssignment | null>(
          `/clients/${clientId}/plan-assignment/current`,
          { method: "GET" },
        );
        setAssignment(currentAssignment);
      } catch (caughtError) {
        setAssignment(null);
        setPlanLoadError(getErrorMessage(caughtError));
      }
    } catch (caughtError) {
      setClient(null);
      setAssignment(null);
      setLoadError(getErrorMessage(caughtError));
      setHasLoaded(true);
    } finally {
      setIsRequestLoading(false);
    }
  }, [authStatus, clientId, isApiReady, request]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAccessScreen();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadAccessScreen]);

  useEffect(() => {
    if (!isRefreshing) {
      notify.dismiss("client-access-refresh");
      return;
    }

    const timer = window.setTimeout(() => {
      notify.refresh("Actualizando acceso", { id: "client-access-refresh" });
    }, 500);

    return () => {
      window.clearTimeout(timer);
      notify.dismiss("client-access-refresh");
    };
  }, [isRefreshing]);

  async function generateAccess(mode: "generate" | "regenerate") {
    if (!client || pendingAction) {
      return false;
    }

    setPendingAction(mode);
    setConfirmationError("");

    try {
      const endpoint =
        mode === "generate" ? `/clients/${client.id}/access` : `/clients/${client.id}/access/regenerate-pin`;
      const response = await request<AccessMutationResponse>(endpoint, { method: "POST" });
      const updated = markAccessGenerated(client.access, response, new Date().toISOString());

      setGeneratedAccess(updated.generatedAccess);
      setClient((current) =>
        current
          ? {
              ...current,
              access: updated.access,
            }
          : current,
      );
      notify.success(mode === "generate" ? "Acceso generado" : "Acceso regenerado");
      return true;
    } catch (caughtError) {
      const message = getErrorMessage(caughtError);
      setConfirmationError(message);
      notify.error(message);
      return false;
    } finally {
      setPendingAction(null);
    }
  }

  async function disableAccess() {
    if (!client || pendingAction) {
      return false;
    }

    setPendingAction("disable");
    setConfirmationError("");

    try {
      await request<ClientAccess>(`/clients/${client.id}/access/disable`, { method: "PATCH" });
      setGeneratedAccess(null);
      setClient((current) =>
        current
          ? {
              ...current,
              access: markAccessDisabled(current.access, new Date().toISOString()),
            }
          : current,
      );
      notify.success("Acceso desactivado");
      return true;
    } catch (caughtError) {
      const message = getErrorMessage(caughtError);
      setConfirmationError(message);
      notify.error(message);
      return false;
    } finally {
      setPendingAction(null);
    }
  }

  async function copyValue(value: string | undefined, label: string) {
    if (!value || pendingAction) {
      return;
    }

    setPendingAction("copy");
    try {
      await navigator.clipboard.writeText(value);
      notify.success(`${label} copiado`);
    } catch (caughtError) {
      notify.error(getErrorMessage(caughtError));
    } finally {
      setPendingAction(null);
    }
  }

  const accessState = client ? buildAccessViewState(client.access) : null;
  const whatsAppMessage = useMemo(() => {
    if (!client || !generatedAccess) {
      return "";
    }

    return `Hola ${client.name}, aqui tienes tu acceso a CoraFit. Entra desde este enlace privado: ${generatedAccess.link}. Tu PIN es: ${generatedAccess.pin}.`;
  }, [client, generatedAccess]);

  if (isInitialLoading) {
    return (
      <WorkspaceFrame
        header={
          <WorkspaceHeader
            title="Acceso al portal"
            description="Cargando datos del cliente..."
          />
        }
      >
        <AccessScreenSkeleton />
      </WorkspaceFrame>
    );
  }

  if (!client) {
    return (
      <WorkspaceFrame
        header={
          <WorkspaceHeader
            title="Acceso al portal"
            description="No se pudo preparar la gestion de acceso."
            actions={<BackToClientButton clientId={clientId} />}
          />
        }
      >
        <div className="p-6">
          {loadError ? (
            <WorkspacePanel>
              <div className="space-y-4 p-5">
                <ClientErrorCard error={loadError} />
                <Button variant="outline" onClick={() => void loadAccessScreen()}>
                  <RefreshCwIcon className="mr-2 size-4" />
                  Reintentar
                </Button>
              </div>
            </WorkspacePanel>
          ) : (
            <ClientNotFoundCard />
          )}
        </div>
      </WorkspaceFrame>
    );
  }

  return (
    <WorkspaceFrame
      header={
        <WorkspaceHeader
          title="Acceso al portal"
          description="Genera y administra las credenciales de acceso de este cliente."
          actions={<BackToClientButton clientId={client.id} />}
        />
      }
    >
      <main className="flex flex-col gap-5 bg-background p-4 md:p-5">
        {loadError ? (
          <InlineLoadError error={loadError} onRetry={() => void loadAccessScreen()} />
        ) : null}
        <AccessSummaryCards
          assignment={assignment}
          client={client}
          planLoadError={planLoadError}
        />
        {generatedAccess ? (
          <GeneratedAccessCard
            access={generatedAccess}
            isCopying={pendingAction === "copy"}
            message={whatsAppMessage}
            onCopyLink={() => void copyValue(generatedAccess.link, "Enlace")}
            onCopyMessage={() => void copyValue(whatsAppMessage, "Mensaje")}
            onCopyPin={() => void copyValue(generatedAccess.pin, "PIN")}
          />
        ) : null}
        {accessState ? (
          <AccessOperationPanel
            access={client.access}
            accessState={accessState}
            pendingAction={pendingAction}
            onDisable={() => setConfirmationTarget("disable")}
            onGenerate={() => void generateAccess("generate")}
            onRegenerate={() => setConfirmationTarget("regenerate")}
          />
        ) : null}
      </main>
      <ConfirmActionDialog
        confirmLabel="Regenerar acceso"
        consequence="Se generara un nuevo enlace y PIN. Las sesiones actuales del cliente dejaran de funcionar."
        description="Confirma que quieres reemplazar las credenciales actuales."
        errorMessage={confirmationTarget === "regenerate" ? confirmationError : null}
        isLoading={pendingAction === "regenerate"}
        onConfirm={() => generateAccess("regenerate")}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmationError("");
          }
          setConfirmationTarget(open ? "regenerate" : null);
        }}
        open={confirmationTarget === "regenerate"}
        title="Regenerar acceso"
      />
      <ConfirmActionDialog
        confirmLabel="Desactivar acceso"
        consequence="El cliente perdera inmediatamente el acceso y necesitara nuevas credenciales para volver a entrar."
        description="Confirma que quieres bloquear el acceso actual del cliente."
        errorMessage={confirmationTarget === "disable" ? confirmationError : null}
        isLoading={pendingAction === "disable"}
        onConfirm={disableAccess}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmationError("");
          }
          setConfirmationTarget(open ? "disable" : null);
        }}
        open={confirmationTarget === "disable"}
        title="Desactivar acceso"
      />
    </WorkspaceFrame>
  );
}

function BackToClientButton({ clientId }: { clientId: string }) {
  return (
    <Button asChild variant="outline">
      <Link href={`/clients/${clientId}`}>
        <ArrowLeftIcon className="mr-2 size-4" />
        Volver al cliente
      </Link>
    </Button>
  );
}

function AccessScreenSkeleton() {
  return (
    <main
      className="flex flex-col gap-5 bg-background p-4 md:p-5"
      role="status"
      aria-label="Cargando acceso"
    >
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <article
            key={index}
            className="rounded-2xl border !border-transparent bg-card p-4 shadow-[var(--surface-shadow-soft)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <Skeleton className="h-4 w-28" />
                <div className="mt-3 flex items-center gap-3">
                  <Skeleton className="size-10 shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <Skeleton className="h-5 w-36 max-w-full" />
                    <Skeleton className="mt-2 h-3 w-44 max-w-full" />
                  </div>
                </div>
              </div>
              <Skeleton className="size-10 shrink-0 rounded-xl" />
            </div>
          </article>
        ))}
      </section>

      <WorkspacePanel>
        <div className="border-b px-4 py-4">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="mt-2 h-3 w-80 max-w-full" />
        </div>
        <div className="flex flex-col gap-5 p-5">
          <div className="grid gap-3 md:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <div
                key={index}
                className="rounded-2xl border !border-transparent bg-background p-4 shadow-[var(--surface-shadow-soft)]"
              >
                <div className="flex items-start gap-3">
                  <Skeleton className="mt-1 size-5 shrink-0 rounded" />
                  <div className="min-w-0 flex-1">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="mt-3 h-4 w-32 max-w-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Skeleton className="h-4 w-[32rem] max-w-full" />
          <div className="flex flex-col gap-3 sm:flex-row">
            <Skeleton className="h-10 w-full sm:w-40" />
            <Skeleton className="h-10 w-full sm:w-40" />
          </div>
        </div>
      </WorkspacePanel>
    </main>
  );
}

function AccessSummaryCards({
  assignment,
  client,
  planLoadError,
}: {
  assignment: CurrentPlanAssignment | null;
  client: Client;
  planLoadError: string;
}) {
  const planSummary = getPlanSummary(assignment, planLoadError);
  const accessMeta = getAccessMeta(client.access.status);

  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" aria-label="Resumen de acceso">
      <AccessMetricCard
        icon={<UserRoundIcon className="size-4" />}
        label="Cliente"
        tone="default"
        title={client.name}
        value={
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-sm font-semibold text-primary">
              {initials(client.name)}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-lg font-semibold text-foreground">{client.name}</span>
              <span className="block truncate text-sm text-muted-foreground">
                {typeLabels[client.clientType]} · {statusLabels[client.operationalStatus]}
              </span>
            </span>
          </div>
        }
      />
      <AccessMetricCard
        icon={accessMeta.icon}
        label="Estado del acceso"
        tone={accessMeta.tone}
        value={
          <div className="mt-1">
            <Badge className={cn("rounded-full", accessMeta.badgeClass)} variant="outline">
              {accessMeta.label}
            </Badge>
          </div>
        }
      />
      <AccessMetricCard
        icon={<ActivityIcon className="size-4" />}
        label="Ultima actividad"
        title={planLoadError || undefined}
        tone={planSummary.tone === "warning" ? "warning" : "muted"}
        value={
          <>
            <span className="block text-lg font-semibold text-foreground">
              {formatDateTime(client.access.lastAccessAt) ?? "Sin actividad"}
            </span>
            <span
              className={cn(
                "mt-1 block truncate text-sm",
                planSummary.tone === "warning"
                  ? "text-amber-700 dark:text-amber-300"
                  : "text-muted-foreground",
              )}
            >
              {planSummary.label}
            </span>
          </>
        }
      />
    </section>
  );
}

function AccessMetricCard({
  icon,
  label,
  title,
  tone = "default",
  value,
}: {
  icon: ReactNode;
  label: string;
  title?: string;
  tone?: "default" | "muted" | "success" | "warning" | "danger";
  value: ReactNode;
}) {
  return (
    <article
      className="rounded-2xl border !border-transparent bg-card p-4 shadow-[var(--surface-shadow-soft)]"
      title={title}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <div className="mt-3 min-w-0">{value}</div>
        </div>
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            metricToneStyles[tone],
          )}
        >
          {icon}
        </span>
      </div>
    </article>
  );
}

function AccessOperationPanel({
  access,
  accessState,
  onDisable,
  onGenerate,
  onRegenerate,
  pendingAction,
}: {
  access: ClientAccess;
  accessState: ReturnType<typeof buildAccessViewState>;
  onDisable: () => void;
  onGenerate: () => void;
  onRegenerate: () => void;
  pendingAction: PendingAccessAction;
}) {
  const isGenerate = accessState.primaryAction === "generate";
  const isDisabled = access.status === "disabled";
  const isLocked = access.status === "temporarily_locked";
  const title = isGenerate
    ? isDisabled
      ? "Acceso desactivado"
      : "Generar acceso"
    : isLocked
      ? "Acceso bloqueado"
      : "Acceso activo";
  const description = isGenerate
    ? isDisabled
      ? "Genera nuevas credenciales para reactivar el portal del cliente."
      : "Crea un enlace privado y un PIN para que el cliente entre a su portal."
    : isLocked
      ? "El acceso esta pausado temporalmente por seguridad."
      : "Las credenciales actuales estan vigentes.";

  return (
    <WorkspacePanel title={title} description={description}>
      <div className="flex flex-col gap-5 p-5">
        {isGenerate ? (
          <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_220px] md:items-center">
            <div className="flex gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
                <KeyRoundIcon className="size-5" />
              </span>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                {isDisabled
                  ? "El acceso anterior esta desactivado. Al generar uno nuevo, se mostrara el enlace privado y el PIN una sola vez."
                  : "El cliente recibira un enlace privado y un PIN. Las credenciales completas se mostraran una sola vez."}
              </p>
            </div>
            <Button
              className="h-11 w-full md:w-auto"
              disabled={Boolean(pendingAction && pendingAction !== "generate") || pendingAction === "generate"}
              onClick={onGenerate}
            >
              {pendingAction === "generate" ? (
                <Loader2Icon className="mr-2 size-4 animate-spin" />
              ) : (
                <SparklesIcon className="mr-2 size-4" />
              )}
              {isDisabled ? "Generar nuevo acceso" : "Generar acceso"}
            </Button>
          </div>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-3">
              <StatusLine
                icon={getAccessMeta(access.status).icon}
                label="Estado"
                value={getAccessStatusLabel(access.status)}
              />
              <StatusLine
                icon={<RefreshCwIcon className="size-5" />}
                label="Ultima actualizacion"
                value={access.updatedAt ?? formatDate(access.updatedAtRaw) ?? "Sin registro"}
              />
              <StatusLine
                icon={<Clock3Icon className="size-5" />}
                label="Ultimo acceso"
                value={formatDateTime(access.lastAccessAt) ?? "Sin actividad"}
              />
            </div>
            {isLocked ? (
              <div className="rounded-2xl border !border-transparent bg-amber-50/70 p-4 text-sm text-amber-950 shadow-[var(--surface-shadow-soft)] dark:bg-amber-950/25 dark:text-amber-100">
                <div className="flex gap-3">
                  <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
                  <p>
                    Desbloqueo: <span className="font-medium">{formatDateTime(access.lockedUntil) ?? "Sin fecha registrada"}</span>
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Las credenciales completas no pueden recuperarse. Regenera el acceso si necesitas compartir nuevas credenciales.
              </p>
            )}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                className="w-full sm:w-auto"
                disabled={Boolean(pendingAction && pendingAction !== "regenerate") || pendingAction === "regenerate"}
                variant="outline"
                onClick={onRegenerate}
              >
                {pendingAction === "regenerate" ? (
                  <Loader2Icon className="mr-2 size-4 animate-spin" />
                ) : (
                  <RefreshCwIcon className="mr-2 size-4" />
                )}
                Regenerar acceso
              </Button>
              <Button
                className="w-full sm:w-auto"
                disabled={Boolean(pendingAction && pendingAction !== "disable") || pendingAction === "disable"}
                variant="destructive"
                onClick={onDisable}
              >
                {pendingAction === "disable" ? (
                  <Loader2Icon className="mr-2 size-4 animate-spin" />
                ) : (
                  <ShieldOffIcon className="mr-2 size-4" />
                )}
                Desactivar acceso
              </Button>
            </div>
          </>
        )}
      </div>
    </WorkspacePanel>
  );
}

const metricToneStyles = {
  danger: "bg-red-50 text-red-700 dark:bg-red-950/45 dark:text-red-300",
  default: "bg-accent text-primary",
  muted: "bg-muted text-muted-foreground",
  success: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/45 dark:text-emerald-300",
  warning: "bg-amber-50 text-amber-700 dark:bg-amber-950/45 dark:text-amber-300",
};

function getAccessMeta(status: ClientAccess["status"]) {
  const meta: Record<
    ClientAccess["status"],
    {
      badgeClass: string;
      icon: ReactNode;
      label: string;
      tone: "default" | "muted" | "success" | "warning" | "danger";
    }
  > = {
    active: {
      badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/35 dark:text-emerald-300",
      icon: <CheckCircle2Icon className="size-4" />,
      label: "Activo",
      tone: "success",
    },
    disabled: {
      badgeClass: "border-muted bg-muted text-muted-foreground",
      icon: <ShieldOffIcon className="size-4" />,
      label: "Desactivado",
      tone: "muted",
    },
    none: {
      badgeClass: "border-border bg-background text-muted-foreground",
      icon: <KeyRoundIcon className="size-4" />,
      label: "Sin acceso",
      tone: "default",
    },
    temporarily_locked: {
      badgeClass: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/35 dark:text-amber-300",
      icon: <LockKeyholeIcon className="size-4" />,
      label: "Bloqueado",
      tone: "warning",
    },
  };

  return meta[status];
}

function GeneratedAccessCard({
  access,
  isCopying,
  message,
  onCopyLink,
  onCopyMessage,
  onCopyPin,
}: {
  access: GeneratedAccess;
  isCopying: boolean;
  message: string;
  onCopyLink: () => void;
  onCopyMessage: () => void;
  onCopyPin: () => void;
}) {
  return (
    <section className="rounded-2xl border !border-transparent bg-card p-4 shadow-[var(--surface-shadow-soft)] ring-1 ring-amber-200/60 dark:ring-amber-900/40">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <CheckCircle2Icon className="size-5 text-amber-700 dark:text-amber-300" />
            Credenciales listas
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Copia y comparte estos datos antes de salir de esta pantalla.
          </p>
        </div>
        <p className="max-w-md text-xs text-muted-foreground">
          Por seguridad, el enlace y el PIN completos no volveran a mostrarse despues de recargar.
        </p>
      </div>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
        <CredentialRow
          isCopying={isCopying}
          label="Link privado"
          value={access.link}
          onCopy={onCopyLink}
        />
        <CredentialRow
          emphasize
          isCopying={isCopying}
          label="PIN"
          value={access.pin}
          onCopy={onCopyPin}
        />
        <CredentialRow
          className="lg:col-span-2"
          isCopying={isCopying}
          label="Mensaje para compartir"
          value={message}
          copyLabel="Copiar mensaje"
          onCopy={onCopyMessage}
        />
      </div>
    </section>
  );
}

function CredentialRow({
  className,
  copyLabel = "Copiar",
  emphasize = false,
  isCopying,
  label,
  onCopy,
  value,
}: {
  className?: string;
  copyLabel?: string;
  emphasize?: boolean;
  isCopying: boolean;
  label: string;
  onCopy: () => void;
  value: string;
}) {
  return (
    <div
      className={cn(
        "grid gap-3 rounded-2xl border !border-transparent bg-background p-3 shadow-[var(--surface-shadow-soft)] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center",
        className,
      )}
    >
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">{label}</p>
        <p
          className={cn(
            "mt-1 break-all",
            emphasize
              ? "font-mono text-3xl font-semibold tracking-[0.18em] text-foreground"
              : "text-sm text-foreground",
          )}
        >
          {value}
        </p>
      </div>
      <Button
        className="w-full sm:w-auto"
        disabled={isCopying || !value}
        variant="outline"
        onClick={onCopy}
      >
        {isCopying ? <Loader2Icon className="mr-2 size-4 animate-spin" /> : <ClipboardIcon className="mr-2 size-4" />}
        {copyLabel}
      </Button>
    </div>
  );
}

function InlineLoadError({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <WorkspacePanel>
      <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
        <ClientErrorCard error={error} />
        <Button className="shrink-0" variant="outline" onClick={onRetry}>
          <RefreshCwIcon className="mr-2 size-4" />
          Reintentar
        </Button>
      </div>
    </WorkspacePanel>
  );
}

function StatusLine({
  caption,
  icon,
  label,
  value,
}: {
  caption?: string;
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border !border-transparent bg-background p-4 shadow-[var(--surface-shadow-soft)]">
      <div className="flex items-start gap-3">
        <div className="mt-1 text-muted-foreground">{icon}</div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 break-words font-medium">{value}</p>
          {caption ? <p className="mt-1 text-xs text-muted-foreground">{caption}</p> : null}
        </div>
      </div>
    </div>
  );
}

function normalizeAccess(access: ClientAccess | null): ClientAccess {
  if (!access) {
    return { status: "none" };
  }

  return {
    id: access.id,
    createdAt: access.createdAt,
    lastAccessAt: access.lastAccessAt,
    lockedUntil: access.lockedUntil,
    status: access.status,
    updatedAt: formatDate(access.updatedAtRaw ?? access.updatedAt ?? access.lastAccessAt ?? access.lockedUntil),
    updatedAtRaw: access.updatedAtRaw ?? access.updatedAt,
  };
}

function getAccessStatusLabel(status: ClientAccess["status"]) {
  const labels: Record<ClientAccess["status"], string> = {
    active: "Activo",
    disabled: "Desactivado",
    none: "Sin acceso",
    temporarily_locked: "Bloqueado",
  };

  return labels[status];
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return undefined;
  }

  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
