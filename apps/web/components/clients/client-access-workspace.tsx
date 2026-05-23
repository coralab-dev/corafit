"use client";

import {
  CheckCircle2Icon,
  ClipboardIcon,
  Clock3Icon,
  EyeIcon,
  InfoIcon,
  KeyRoundIcon,
  Loader2Icon,
  LockKeyholeIcon,
  MessageCircleIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
  ShieldOffIcon,
  SmartphoneIcon,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import {
  apiRequest,
  formatDate,
  getErrorMessage,
  getInitialApiConfig,
  initials,
  statusLabels,
  typeLabels,
} from "@/lib/clients/api";
import type { AccessStatus, ApiConfig, Client, ClientAccess, CurrentPlanAssignment } from "@/lib/clients/types";
import { ClientErrorCard, ClientDetailLoadingCard, ClientNotFoundCard } from "./workspace-panels";

type GeneratedAccess = {
  link: string;
  pin: string;
};

type AccessResponse = {
  access: { id: string; status: AccessStatus };
  link: string;
  pin: string;
};

export function ClientAccessWorkspace({ clientId }: { clientId: string }) {
  const [apiConfig] = useState<ApiConfig>(getInitialApiConfig);
  const [client, setClient] = useState<Client | null>(null);
  const [assignment, setAssignment] = useState<CurrentPlanAssignment | null>(null);
  const [generatedAccess, setGeneratedAccess] = useState<GeneratedAccess | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isApiReady = Boolean(apiConfig.bearerToken.trim() && apiConfig.organizationId.trim());

  const loadAccessScreen = useCallback(async () => {
    if (!isApiReady) {
      setClient(null);
      setAssignment(null);
      setError("Configura el JWT del coach y la organizacion para leer clientes reales.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const [selectedClient, access, currentAssignment] = await Promise.all([
        apiRequest<Omit<Client, "access">>(`/clients/${clientId}`, { method: "GET" }, apiConfig),
        apiRequest<ClientAccess | null>(`/clients/${clientId}/access`, { method: "GET" }, apiConfig),
        apiRequest<CurrentPlanAssignment | null>(
          `/clients/${clientId}/plan-assignment/current`,
          { method: "GET" },
          apiConfig,
        ).catch(() => null),
      ]);

      setClient({
        ...selectedClient,
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
      });
      setAssignment(currentAssignment);
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setIsLoading(false);
    }
  }, [apiConfig, clientId, isApiReady]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAccessScreen();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadAccessScreen]);

  async function generateAccess(mode: "create" | "regenerate") {
    if (!client) {
      return;
    }

    setIsSubmitting(true);
    setError("");
    try {
      const endpoint =
        mode === "create" ? `/clients/${client.id}/access` : `/clients/${client.id}/access/regenerate-pin`;
      const response = await apiRequest<AccessResponse>(endpoint, { method: "POST" }, apiConfig);
      const updatedAt = new Date().toISOString();

      setGeneratedAccess({ link: response.link, pin: response.pin });
      setClient((current) =>
        current
          ? {
              ...current,
              access: {
                ...current.access,
                id: response.access.id,
                link: response.link,
                pin: response.pin,
                status: response.access.status,
                updatedAtRaw: updatedAt,
                updatedAt: "Ahora",
              },
            }
          : current,
      );
      toast.success(mode === "create" ? "Acceso generado" : "Acceso regenerado");
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function disableAccess() {
    if (!client) {
      return;
    }

    setIsSubmitting(true);
    setError("");
    try {
      await apiRequest<ClientAccess>(
        `/clients/${client.id}/access/disable`,
        { method: "PATCH" },
        apiConfig,
      );
      setGeneratedAccess(null);
      setClient((current) =>
        current
          ? {
              ...current,
              access: {
                status: "disabled",
                updatedAtRaw: new Date().toISOString(),
                updatedAt: "Ahora",
              },
            }
          : current,
      );
      toast.success("Acceso desactivado");
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function copyValue(value: string | undefined, label: string) {
    if (!value) {
      setError("El link y el PIN completos solo se muestran al generar o regenerar acceso.");
      return;
    }

    await navigator.clipboard.writeText(value);
    toast.success(`${label} copiado`);
  }

  const whatsAppMessage = useMemo(() => {
    if (!client || !generatedAccess) {
      return "";
    }

    return `Hola ${client.name}, aqui tienes tu acceso a CoraFit. Entra desde este link: ${generatedAccess.link}. Tu PIN es: ${generatedAccess.pin}.`;
  }, [client, generatedAccess]);

  if (isLoading) {
    return <ClientDetailLoadingCard />;
  }

  if (!client) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader
          eyebrow="Clientes"
          title="Generar acceso"
          description="No se encontro el cliente solicitado."
          actions={
            <Button asChild variant="outline">
              <Link href="/clients">Volver a clientes</Link>
            </Button>
          }
        />
        {error ? <ClientErrorCard error={error} /> : <ClientNotFoundCard />}
      </div>
    );
  }

  const hasGeneratedCredentials = Boolean(generatedAccess);
  const isActive = client.access.status === "active";
  const canCreate = client.access.status === "none" || client.access.status === "disabled";

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Clientes"
        title="Generar acceso"
      />

      {error ? <ClientErrorCard error={error} /> : null}

      <AccessClientSummary client={client} assignment={assignment} />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="flex min-w-0 flex-col gap-4">
          <AccessGenerationCard
            canCreate={canCreate}
            isSubmitting={isSubmitting}
            onGenerate={() => generateAccess(canCreate ? "create" : "regenerate")}
          />

          <GeneratedAccessCard
            access={generatedAccess}
            isActive={isActive}
            message={whatsAppMessage}
            onCopyLink={() => copyValue(generatedAccess?.link, "Link")}
            onCopyPin={() => copyValue(generatedAccess?.pin, "PIN")}
            onCopyMessage={() => copyValue(whatsAppMessage, "Mensaje")}
          />
        </div>

        <AccessStatusCard
          access={client.access}
          hasGeneratedCredentials={hasGeneratedCredentials}
          isSubmitting={isSubmitting}
          onDisable={disableAccess}
          onRegenerate={() => generateAccess("regenerate")}
        />
      </div>
    </div>
  );
}

function AccessClientSummary({
  assignment,
  client,
}: {
  assignment: CurrentPlanAssignment | null;
  client: Client;
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-full border bg-muted text-lg font-semibold text-primary">
            {initials(client.name)}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-2xl font-semibold tracking-normal">{client.name}</h2>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline" className="gap-1.5">
                <span className="size-2 rounded-full bg-primary" />
                {statusLabels[client.operationalStatus]}
              </Badge>
              <Badge variant="outline">{typeLabels[client.clientType]}</Badge>
              <span>
                Objetivo: <span className="font-medium text-primary">{client.mainGoal}</span>
              </span>
            </div>
          </div>
        </div>
        <Button asChild variant="outline">
          <Link href={`/clients/${client.id}`}>
            <EyeIcon className="mr-2 size-4" />
            Ver ficha del cliente
          </Link>
        </Button>
      </CardContent>
      {assignment?.assignedPlan ? (
        <div className="border-t px-5 py-3 text-sm text-muted-foreground">
          Plan actual: <span className="font-medium text-foreground">{assignment.assignedPlan.name}</span>
        </div>
      ) : null}
    </Card>
  );
}

function AccessGenerationCard({
  canCreate,
  isSubmitting,
  onGenerate,
}: {
  canCreate: boolean;
  isSubmitting: boolean;
  onGenerate: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Generar nuevo acceso</CardTitle>
        <CardDescription>El cliente entrara con link privado y PIN.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="mb-2 text-sm font-medium">Tipo de PIN</p>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex min-h-12 items-center gap-3 rounded-md border border-primary bg-primary/5 px-4 text-sm font-medium">
              <span className="flex size-5 items-center justify-center rounded-full border-2 border-primary">
                <span className="size-2 rounded-full bg-primary" />
              </span>
              Generar automatico
            </div>
            <div className="flex min-h-12 items-center justify-between gap-3 rounded-md border px-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-3">
                <span className="size-5 rounded-full border" />
                Definir manualmente
              </span>
              <Badge variant="outline">Proximamente</Badge>
            </div>
          </div>
        </div>
        <Button className="h-12 w-full" disabled={isSubmitting} onClick={onGenerate}>
          {isSubmitting ? (
            <Loader2Icon className="mr-2 size-4 animate-spin" />
          ) : (
            <KeyRoundIcon className="mr-2 size-4" />
          )}
          {canCreate ? "Generar acceso" : "Regenerar link + PIN"}
        </Button>
      </CardContent>
    </Card>
  );
}

function GeneratedAccessCard({
  access,
  isActive,
  message,
  onCopyLink,
  onCopyMessage,
  onCopyPin,
}: {
  access: GeneratedAccess | null;
  isActive: boolean;
  message: string;
  onCopyLink: () => void;
  onCopyMessage: () => void;
  onCopyPin: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2Icon className={access ? "text-primary" : "text-muted-foreground"} />
          {access ? "Acceso generado" : "Credenciales no visibles"}
        </CardTitle>
        <CardDescription>
          {access
            ? "Copia estos datos ahora. No se volveran a mostrar completos."
            : isActive
              ? "El acceso esta activo, pero el link completo y PIN solo se muestran al generar o regenerar."
              : "Genera un acceso para mostrar link privado, PIN y mensaje sugerido."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <CopyRow label="Link privado" value={access?.link ?? ""} onCopy={onCopyLink} />
        <CopyRow label="PIN de acceso" value={access?.pin ?? ""} onCopy={onCopyPin} />
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_190px]">
          <div className="rounded-md border bg-background p-4 text-sm text-muted-foreground">
            <p className="mb-2 font-medium text-foreground">Mensaje sugerido para WhatsApp</p>
            {message ? (
              <p>{message}</p>
            ) : (
              <p>Disponible cuando generes o regeneres un acceso.</p>
            )}
          </div>
          <Button className="h-full min-h-14" disabled={!message} onClick={onCopyMessage}>
            <MessageCircleIcon className="mr-2 size-5" />
            Copiar mensaje
          </Button>
        </div>
        {access ? (
          <div className="flex gap-3 rounded-md border border-primary/40 bg-primary/10 p-4 text-sm">
            <InfoIcon className="mt-0.5 size-4 shrink-0 text-primary" />
            <p>El link completo solo se muestra ahora. Si lo pierdes, deberas regenerarlo.</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function CopyRow({
  label,
  onCopy,
  value,
}: {
  label: string;
  onCopy: () => void;
  value: string;
}) {
  return (
    <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_150px]">
      <label className="text-sm font-medium md:col-span-2">{label}</label>
      <div className="min-h-11 rounded-md border bg-background px-3 py-2 text-sm">
        {value ? <p className="break-all">{value}</p> : <p className="text-muted-foreground">No visible</p>}
      </div>
      <Button variant="outline" disabled={!value} onClick={onCopy}>
        <ClipboardIcon className="mr-2 size-4" />
        Copiar
      </Button>
    </div>
  );
}

function AccessStatusCard({
  access,
  hasGeneratedCredentials,
  isSubmitting,
  onDisable,
  onRegenerate,
}: {
  access: ClientAccess;
  hasGeneratedCredentials: boolean;
  isSubmitting: boolean;
  onDisable: () => void;
  onRegenerate: () => void;
}) {
  const isActive = access.status === "active";
  const statusLabel = getAccessStatusLabel(access.status);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Estado del acceso</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border border-primary/40 bg-primary/10 p-4">
          <div className="flex items-start gap-3">
            <span className="mt-1 size-3 rounded-full bg-primary shadow-[0_0_12px_hsl(var(--primary))]" />
            <div>
              <p className="font-semibold text-primary">{statusLabel}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {isActive
                  ? "El cliente puede entrar a su portal con credenciales vigentes."
                  : "El cliente no puede entrar hasta que generes un nuevo acceso."}
              </p>
            </div>
          </div>
        </div>

        <StatusLine
          icon={<Clock3Icon className="size-5" />}
          label="Ultimo acceso"
          value={formatDateTime(access.lastAccessAt) ?? "Sin actividad"}
        />
        <StatusLine
          icon={<KeyRoundIcon className="size-5" />}
          label="PIN vigente"
          value={hasGeneratedCredentials ? "Visible ahora" : "Oculto por seguridad"}
          caption={access.updatedAt ? `Actualizado: ${access.updatedAt}` : undefined}
        />
        <StatusLine
          icon={<SmartphoneIcon className="size-5" />}
          label="Regla de sesion"
          value="Proximamente"
          caption="1 dispositivo a la vez aun no esta implementado."
        />

        <div className="space-y-3 pt-2">
          <Button className="w-full" variant="outline" disabled={isSubmitting} onClick={onRegenerate}>
            {isSubmitting ? (
              <Loader2Icon className="mr-2 size-4 animate-spin" />
            ) : (
              <RefreshCwIcon className="mr-2 size-4" />
            )}
            Regenerar link + PIN
          </Button>
          <Button className="w-full" variant="outline" disabled>
            <LockKeyholeIcon className="mr-2 size-4" />
            Regenerar PIN
            <Badge className="ml-2" variant="outline">Proximamente</Badge>
          </Button>
          <Button
            className="w-full"
            variant="destructive"
            disabled={!isActive || isSubmitting}
            onClick={onDisable}
          >
            <ShieldOffIcon className="mr-2 size-4" />
            Desactivar acceso
          </Button>
        </div>

        <div className="flex gap-3 pt-2 text-sm text-muted-foreground">
          <ShieldCheckIcon className="mt-0.5 size-4 shrink-0" />
          <p>Al desactivar, el cliente ya no podra entrar hasta que generes un nuevo acceso.</p>
        </div>
      </CardContent>
    </Card>
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
    <div className="flex items-start gap-3 border-b pb-4 last:border-b-0">
      <div className="mt-1 text-muted-foreground">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 font-medium">{value}</p>
        {caption ? <p className="mt-1 text-xs text-muted-foreground">{caption}</p> : null}
      </div>
    </div>
  );
}

function getAccessStatusLabel(status: AccessStatus) {
  const labels: Record<AccessStatus, string> = {
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
