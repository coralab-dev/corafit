"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Link2Off, Loader2, Lock } from "lucide-react";
import { CoraFitApiError } from "@/lib/api/authenticated-request";
import {
  getClientPortalSession,
  getClientPortalTokenStatus,
  type ClientPortalTokenStatus,
} from "@/lib/client-portal/api";
import { ClientPortalShell, PinAccessScreen } from "@/components/client-portal/client-portal";

type AccessGateState =
  | { type: "checking" }
  | { type: "pin"; tokenStatus: ClientPortalTokenStatus }
  | { type: "invalid" }
  | { type: "locked"; lockedUntil?: string | null }
  | { type: "error"; message: string };

export function ClientPortalAccessGate({ token }: { token: string }) {
  const router = useRouter();
  const [state, setState] = useState<AccessGateState>({ type: "checking" });

  useEffect(() => {
    let alive = true;

    async function run() {
      try {
        const session = await getClientPortalSession(token);
        if (!alive) return;

        if (session.authenticated) {
          router.replace(`/c/${encodeURIComponent(token)}/home`);
          return;
        }
      } catch (caught) {
        if (!isExpectedMissingSession(caught)) {
          if (alive) {
            setState({ type: "error", message: errorMessage(caught, "No pudimos validar tu acceso.") });
          }
          return;
        }
      }

      try {
        const tokenStatus = await getClientPortalTokenStatus(token);
        if (!alive) return;

        if (!tokenStatus.valid) {
          setState({ type: "invalid" });
          return;
        }

        if (tokenStatus.locked) {
          setState({ type: "locked", lockedUntil: tokenStatus.lockedUntil });
          return;
        }

        setState({ type: "pin", tokenStatus });
      } catch (caught) {
        if (alive) {
          setState({ type: "error", message: errorMessage(caught, "No pudimos validar tu acceso.") });
        }
      }
    }

    void run();

    return () => {
      alive = false;
    };
  }, [router, token]);

  if (state.type === "pin") {
    return (
      <PinAccessScreen
        clientName={state.tokenStatus.clientName}
        token={token}
      />
    );
  }

  if (state.type === "invalid") {
    return (
      <ClientPortalShell token={token}>
        <AccessState
          description="Pide a tu coach que te comparta un nuevo enlace."
          icon={<Link2Off className="size-5" />}
          title="Este acceso ya no está disponible"
        />
      </ClientPortalShell>
    );
  }

  if (state.type === "locked") {
    return (
      <ClientPortalShell token={token}>
        <AccessState
          icon={<Lock className="size-5" />}
          title="Acceso bloqueado temporalmente"
          description={formatLockedDescription(state.lockedUntil)}
        />
      </ClientPortalShell>
    );
  }

  if (state.type === "error") {
    return (
      <ClientPortalShell token={token}>
        <AccessState
          description={state.message}
          icon={<AlertTriangle className="size-5" />}
          title="No pudimos validar tu acceso"
        />
      </ClientPortalShell>
    );
  }

  return (
    <ClientPortalShell token={token}>
      <AccessState loading title="Validando tu acceso…" />
    </ClientPortalShell>
  );
}

function AccessState({
  title,
  description,
  loading,
  icon,
}: {
  title: string;
  description?: string;
  loading?: boolean;
  icon?: ReactNode;
}) {
  return (
    <section className="client-portal-viewport flex items-center justify-center px-5 py-8 text-center sm:px-6 md:px-8">
      <div
        aria-live={loading ? "polite" : undefined}
        className="w-full max-w-md rounded-3xl border border-transparent bg-card p-5 shadow-[var(--surface-shadow)] sm:p-7"
        role={loading ? "status" : "alert"}
      >
        <span className="mx-auto flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          {loading ? (
            <Loader2 aria-hidden="true" className="size-5 animate-spin" />
          ) : (
            <span aria-hidden="true">{icon}</span>
          )}
        </span>
        <h1 className="mt-5 text-2xl font-semibold leading-tight text-foreground">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function isExpectedMissingSession(caught: unknown) {
  return caught instanceof CoraFitApiError && caught.status === 401;
}

function formatLockedDescription(lockedUntil?: string | null) {
  const coachHelp =
    "Si no recuerdas tu PIN, pide a tu coach que regenere tu acceso.";
  if (!lockedUntil) {
    return `Por seguridad, intenta nuevamente más tarde. ${coachHelp}`;
  }

  const date = new Date(lockedUntil);
  if (Number.isNaN(date.getTime())) {
    return `Por seguridad, intenta nuevamente más tarde. ${coachHelp}`;
  }

  return `Intenta nuevamente después de ${date.toLocaleString("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  })}. ${coachHelp}`;
}

function errorMessage(caught: unknown, fallback: string) {
  if (caught instanceof Error) return caught.message;
  return fallback;
}
