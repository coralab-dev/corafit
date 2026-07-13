"use client";

import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  CheckCircle2Icon,
  ClipboardIcon,
  Clock3Icon,
  KeyRoundIcon,
  Loader2Icon,
  LockKeyholeIcon,
  MessageCircleIcon,
  RefreshCwIcon,
  ShieldOffIcon,
  SparklesIcon,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { ConfirmActionDialog } from "@/components/shared/confirm-action-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  WorkspaceFrame,
  WorkspaceHeader,
  WorkspacePanel,
  WorkspaceSplit,
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
import { ClientDetailLoadingCard, ClientErrorCard, ClientNotFoundCard } from "./workspace-panels";

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
        <div className="flex min-h-96 items-center justify-center">
          <ClientDetailLoadingCard />
        </div>
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
          description="Gestiona el enlace privado y el PIN del cliente."
          actions={<BackToClientButton clientId={client.id} />}
        />
      }
    >
      <WorkspaceSplit
        main={
          <div className="flex flex-col gap-5 bg-[linear-gradient(180deg,hsl(var(--background)),hsl(var(--muted))/0.32)] p-4 md:p-6">
            {loadError ? (
              <InlineLoadError error={loadError} onRetry={() => void loadAccessScreen()} />
            ) : null}
            {isRefreshing ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2Icon className="size-4 animate-spin" />
                Actualizando acceso...
              </div>
            ) : null}
            <AccessClientSummary
              assignment={assignment}
              client={client}
              planLoadError={planLoadError}
            />
            {accessState ? (
              <div className="xl:hidden">
                <AccessStatusPanel
                  access={client.access}
                  accessState={accessState}
                  pendingAction={pendingAction}
                  onDisable={() => setConfirmationTarget("disable")}
                  onRegenerate={() => setConfirmationTarget("regenerate")}
                />
              </div>
            ) : null}
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
            {accessState?.primaryAction === "generate" ? (
              <AccessEmptyPanel
                isPending={pendingAction === "generate"}
                isBlocked={Boolean(pendingAction && pendingAction !== "generate")}
                onGenerate={() => void generateAccess("generate")}
              />
            ) : (
              <ActiveAccessPanel access={client.access} />
            )}
          </div>
        }
        side={
          accessState ? (
            <div className="sticky top-5 p-5">
              <AccessStatusPanel
                access={client.access}
                accessState={accessState}
                pendingAction={pendingAction}
                onDisable={() => setConfirmationTarget("disable")}
                onRegenerate={() => setConfirmationTarget("regenerate")}
              />
            </div>
          ) : null
        }
        sideClassName="hidden xl:block"
      />
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

function AccessClientSummary({
  assignment,
  client,
  planLoadError,
}: {
  assignment: CurrentPlanAssignment | null;
  client: Client;
  planLoadError: string;
}) {
  const planSummary = getPlanSummary(assignment, planLoadError);

  return (
    <WorkspacePanel className="overflow-hidden border-amber-200/50 bg-card/95 dark:border-amber-900/30">
      <div className="flex items-center gap-4 p-5">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-lg font-semibold text-amber-900 ring-1 ring-amber-200 dark:bg-amber-950/45 dark:text-amber-100 dark:ring-amber-900/50">
          {initials(client.name)}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-xl font-semibold tracking-normal">{client.name}</h2>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline">{statusLabels[client.operationalStatus]}</Badge>
            <Badge variant="outline">{typeLabels[client.clientType]}</Badge>
            <span>
              Objetivo: <span className="font-medium text-foreground">{client.mainGoal}</span>
            </span>
          </div>
        </div>
      </div>
      <div className="grid gap-3 border-t px-5 py-4 text-sm md:grid-cols-3">
        <SummaryFact label="Estado operativo" value={statusLabels[client.operationalStatus]} />
        <SummaryFact label="Modalidad" value={typeLabels[client.clientType]} />
        <SummaryFact
          label="Plan actual"
          tone={planSummary.tone}
          value={planSummary.label}
          title={planLoadError || undefined}
        />
      </div>
    </WorkspacePanel>
  );
}

function SummaryFact({
  label,
  title,
  tone = "muted",
  value,
}: {
  label: string;
  title?: string;
  tone?: "muted" | "success" | "warning";
  value: string;
}) {
  return (
    <div title={title}>
      <p className="text-xs uppercase tracking-normal text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 font-medium",
          tone === "success" ? "text-foreground" : null,
          tone === "warning" ? "text-amber-700 dark:text-amber-300" : null,
          tone === "muted" ? "text-muted-foreground" : null,
        )}
      >
        {value}
      </p>
    </div>
  );
}

function AccessEmptyPanel({
  isBlocked,
  isPending,
  onGenerate,
}: {
  isBlocked: boolean;
  isPending: boolean;
  onGenerate: () => void;
}) {
  return (
    <WorkspacePanel>
      <div className="grid gap-5 p-5 md:grid-cols-[minmax(0,1fr)_220px] md:items-center">
        <div>
          <div className="mb-3 flex size-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 dark:bg-amber-950/45 dark:text-amber-200">
            <KeyRoundIcon className="size-5" />
          </div>
          <h2 className="text-lg font-semibold">Preparar acceso privado</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            El cliente recibira un enlace privado y un PIN para entrar a su portal. Las credenciales completas se mostraran una sola vez al generarlas.
          </p>
        </div>
        <Button className="h-12 w-full" disabled={isBlocked || isPending} onClick={onGenerate}>
          {isPending ? <Loader2Icon className="mr-2 size-4 animate-spin" /> : <SparklesIcon className="mr-2 size-4" />}
          Generar acceso
        </Button>
      </div>
    </WorkspacePanel>
  );
}

function ActiveAccessPanel({ access }: { access: ClientAccess }) {
  const isLocked = access.status === "temporarily_locked";

  return (
    <WorkspacePanel
      title={isLocked ? "Acceso temporalmente bloqueado" : "Acceso vigente"}
      description={
        isLocked
          ? "El cliente no puede entrar hasta que termine el bloqueo o se regeneren credenciales."
          : "El cliente puede entrar con sus credenciales actuales."
      }
    >
      <div className="grid gap-4 p-5 md:grid-cols-3">
        {isLocked ? (
          <StatusLine
            icon={<LockKeyholeIcon className="size-5" />}
            label="Desbloqueo"
            value={formatDateTime(access.lockedUntil) ?? "Sin fecha registrada"}
          />
        ) : null}
        <StatusLine
          icon={<Clock3Icon className="size-5" />}
          label="Ultimo acceso"
          value={formatDateTime(access.lastAccessAt) ?? "Sin actividad"}
        />
        <StatusLine
          icon={<RefreshCwIcon className="size-5" />}
          label="Actualizado"
          value={access.updatedAt ?? formatDate(access.updatedAtRaw) ?? "Sin registro"}
        />
        <StatusLine
          icon={<KeyRoundIcon className="size-5" />}
          label="Credenciales"
          value="Ocultas por seguridad"
          caption="Las credenciales completas no se pueden recuperar."
        />
      </div>
    </WorkspacePanel>
  );
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
    <WorkspacePanel className="border-emerald-200/60 bg-emerald-50/70 dark:border-emerald-900/40 dark:bg-emerald-950/20">
      <div className="border-b border-emerald-200/70 px-5 py-4 dark:border-emerald-900/40">
        <h2 className="flex items-center gap-2 text-base font-semibold text-emerald-950 dark:text-emerald-100">
          <CheckCircle2Icon className="size-5 text-emerald-700 dark:text-emerald-300" />
          Credenciales listas
        </h2>
        <p className="mt-1 text-sm text-emerald-900/75 dark:text-emerald-100/75">
          Copia estos datos ahora. Las credenciales completas solo aparecen en este momento.
        </p>
      </div>
      <div className="space-y-4 p-5">
        <CopyRow
          isCopying={isCopying}
          label="Enlace privado"
          value={access.link}
          onCopy={onCopyLink}
        />
        <CopyRow
          isCopying={isCopying}
          label="PIN"
          value={access.pin}
          onCopy={onCopyPin}
        />
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px]">
          <div className="rounded-2xl border border-emerald-200/70 bg-background/80 p-4 text-sm text-muted-foreground dark:border-emerald-900/40">
            <p className="mb-2 font-medium text-foreground">Mensaje sugerido para WhatsApp</p>
            <p>{message}</p>
          </div>
          <Button className="h-full min-h-12" disabled={isCopying || !message} onClick={onCopyMessage}>
            {isCopying ? <Loader2Icon className="mr-2 size-4 animate-spin" /> : <MessageCircleIcon className="mr-2 size-5" />}
            Copiar mensaje
          </Button>
        </div>
        <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/25 dark:text-amber-100">
          <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
          <p>Guarda o envia estas credenciales antes de salir de la pantalla. No se guardan en este navegador.</p>
        </div>
      </div>
    </WorkspacePanel>
  );
}

function CopyRow({
  isCopying,
  label,
  onCopy,
  value,
}: {
  isCopying: boolean;
  label: string;
  onCopy: () => void;
  value: string;
}) {
  return (
    <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_140px]">
      <label className="text-sm font-medium md:col-span-2">{label}</label>
      <div className="min-h-11 rounded-2xl border bg-background/85 px-3 py-2 text-sm">
        <p className="break-all">{value}</p>
      </div>
      <Button variant="outline" disabled={isCopying || !value} onClick={onCopy}>
        {isCopying ? <Loader2Icon className="mr-2 size-4 animate-spin" /> : <ClipboardIcon className="mr-2 size-4" />}
        Copiar
      </Button>
    </div>
  );
}

function AccessStatusPanel({
  access,
  accessState,
  onDisable,
  onRegenerate,
  pendingAction,
}: {
  access: ClientAccess;
  accessState: ReturnType<typeof buildAccessViewState>;
  onDisable: () => void;
  onRegenerate: () => void;
  pendingAction: PendingAccessAction;
}) {
  const isGenerate = accessState.primaryAction === "generate";
  const primaryPending = pendingAction === accessState.primaryAction;
  const hasOtherPending = Boolean(pendingAction && !primaryPending);

  return (
    <WorkspacePanel title="Estado del acceso">
      <div className="space-y-4 p-4">
        <div
          className={cn(
            "rounded-2xl border p-4",
            accessState.tone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-100"
              : null,
            accessState.tone === "warning"
              ? "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/25 dark:text-amber-100"
              : null,
            accessState.tone === "neutral"
              ? "border-border bg-muted/40 text-foreground"
              : null,
          )}
        >
          <p className="font-semibold">{getAccessStatusLabel(access.status)}</p>
          <p className="mt-1 text-sm opacity-80">{accessState.copy}</p>
        </div>

        {accessState.lockedUntil ? (
          <StatusLine
            icon={<LockKeyholeIcon className="size-5" />}
            label="Desbloqueo"
            value={formatDateTime(accessState.lockedUntil) ?? "Sin fecha registrada"}
          />
        ) : null}
        <StatusLine
          icon={<Clock3Icon className="size-5" />}
          label="Ultimo acceso"
          value={formatDateTime(access.lastAccessAt) ?? "Sin actividad"}
        />
        <StatusLine
          icon={<RefreshCwIcon className="size-5" />}
          label="Actualizado"
          value={access.updatedAt ?? formatDate(access.updatedAtRaw) ?? "Sin registro"}
        />

        {isGenerate ? null : (
          <div className="space-y-3 pt-1">
            <Button
              className="w-full"
              disabled={hasOtherPending || primaryPending}
              variant="outline"
              onClick={onRegenerate}
            >
              {primaryPending ? (
                <Loader2Icon className="mr-2 size-4 animate-spin" />
              ) : (
                <RefreshCwIcon className="mr-2 size-4" />
              )}
              Regenerar acceso
            </Button>
            <Button
              className="w-full"
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
        )}
      </div>
    </WorkspacePanel>
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
    <div className="min-w-0 rounded-2xl border bg-background/70 p-4">
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
    temporarily_locked: "Bloqueado temporalmente",
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
