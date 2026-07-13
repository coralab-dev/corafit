import type { AccessStatus, ClientAccess, CurrentPlanAssignment } from "@/lib/clients/types";

export type PendingAccessAction = "generate" | "regenerate" | "disable" | "copy" | null;
export type AccessAction = Exclude<PendingAccessAction, "copy" | null>;

export type GeneratedAccess = {
  link: string;
  pin: string;
};

export type AccessMutationResponse = {
  access: { id: string; status: AccessStatus };
  link: string;
  pin: string;
};

export type AccessViewState = {
  copy: string;
  lockedUntil: string | null;
  primaryAction: AccessAction;
  secondaryActions: AccessAction[];
  tone: "neutral" | "success" | "warning";
};

export function buildAccessViewState(access: ClientAccess): AccessViewState {
  if (access.status === "active") {
    return {
      copy: "Acceso vigente. Las credenciales completas no se pueden recuperar; regenera el acceso si necesitas compartir nuevas credenciales.",
      lockedUntil: null,
      primaryAction: "regenerate",
      secondaryActions: ["disable"],
      tone: "success",
    };
  }

  if (access.status === "temporarily_locked") {
    return {
      copy: "Acceso bloqueado temporalmente. Puedes regenerar credenciales para restablecerlo o desactivarlo.",
      lockedUntil: access.lockedUntil ?? null,
      primaryAction: "regenerate",
      secondaryActions: ["disable"],
      tone: "warning",
    };
  }

  return {
    copy: "El cliente recibira un enlace privado y un PIN para entrar a su portal.",
    lockedUntil: null,
    primaryAction: "generate",
    secondaryActions: [],
    tone: "neutral",
  };
}

export function markAccessGenerated(
  currentAccess: ClientAccess,
  response: AccessMutationResponse,
  updatedAt: string,
) {
  return {
    access: {
      ...currentAccess,
      id: response.access.id,
      lockedUntil: null,
      status: "active" as const,
      updatedAt: "Ahora",
      updatedAtRaw: updatedAt,
    },
    generatedAccess: {
      link: response.link,
      pin: response.pin,
    },
  };
}

export function markAccessDisabled(currentAccess: ClientAccess, updatedAt: string): ClientAccess {
  return {
    ...currentAccess,
    lockedUntil: null,
    status: "disabled",
    updatedAt: "Ahora",
    updatedAtRaw: updatedAt,
  };
}

export function getPlanSummary(
  assignment: CurrentPlanAssignment | null,
  planError: string,
): { label: string; tone: "muted" | "success" | "warning" } {
  if (assignment?.assignedPlan) {
    return { label: assignment.assignedPlan.name, tone: "success" };
  }

  if (planError) {
    return { label: "Plan no disponible", tone: "warning" };
  }

  return { label: "Sin plan activo", tone: "muted" };
}

export function resolveAccessLoadFailure<TClient, TAssignment>({
  assignment,
  client,
  hasLoaded,
}: {
  assignment: TAssignment | null;
  client: TClient | null;
  hasLoaded: boolean;
}) {
  if (hasLoaded && client) {
    return { assignment, client };
  }

  return { assignment: null, client: null };
}
