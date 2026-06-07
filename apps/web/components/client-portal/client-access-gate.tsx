"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
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
    return <PinAccessScreen token={token} />;
  }

  if (state.type === "invalid") {
    return (
      <ClientPortalShell token={token}>
        <AccessState title="Este acceso ya no esta disponible" description="Pide a tu coach que te comparta un nuevo link." />
      </ClientPortalShell>
    );
  }

  if (state.type === "locked") {
    return (
      <ClientPortalShell token={token}>
        <AccessState
          title="Acceso bloqueado temporalmente"
          description={formatLockedDescription(state.lockedUntil)}
        />
      </ClientPortalShell>
    );
  }

  if (state.type === "error") {
    return (
      <ClientPortalShell token={token}>
        <AccessState title="No pudimos validar tu acceso" description={state.message} />
      </ClientPortalShell>
    );
  }

  return (
    <ClientPortalShell token={token}>
      <AccessState loading title="Validando tu acceso..." />
    </ClientPortalShell>
  );
}

function AccessState({
  title,
  description,
  loading,
}: {
  title: string;
  description?: string;
  loading?: boolean;
}) {
  return (
    <section className="client-portal-viewport flex flex-col items-center justify-center px-8 text-center">
      {loading ? <Loader2 className="mb-4 size-8 animate-spin text-[#df4d3e]" /> : null}
      <h1 className="text-xl font-bold">{title}</h1>
      {description ? <p className="mt-3 text-sm leading-6 text-[#667080]">{description}</p> : null}
    </section>
  );
}

function isExpectedMissingSession(caught: unknown) {
  return caught instanceof CoraFitApiError && caught.status === 401;
}

function formatLockedDescription(lockedUntil?: string | null) {
  if (!lockedUntil) return "Por seguridad, intenta nuevamente mas tarde.";

  const date = new Date(lockedUntil);
  if (Number.isNaN(date.getTime())) return "Por seguridad, intenta nuevamente mas tarde.";

  return `Intenta nuevamente despues de ${date.toLocaleString("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  })}.`;
}

function errorMessage(caught: unknown, fallback: string) {
  if (caught instanceof Error) return caught.message;
  return fallback;
}
