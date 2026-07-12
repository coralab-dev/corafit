import type {
  AccessStatus,
  CurrentPlanAssignment,
  TrainingPlan,
} from "../../lib/clients/types";

export type ClientPagePlanSummary =
  | {
      state: "unknown" | "error" | "none";
      badgeLabel: string;
      title: string;
      detail: string;
      durationWeeks: null;
      sessionCount: null;
    }
  | {
      state: "assigned";
      badgeLabel: string;
      title: string;
      detail: string;
      durationWeeks: number;
      sessionCount: number;
    };

export function resolveClientPagePlanSummary(
  assignment: CurrentPlanAssignment | null | undefined,
  isLoading: boolean,
  error?: string | null,
): ClientPagePlanSummary {
  if (assignment === undefined && error) {
    return {
      state: "error",
      badgeLabel: "Error",
      title: "No se pudo cargar el plan actual",
      detail: error,
      durationWeeks: null,
      sessionCount: null,
    };
  }

  if (assignment === undefined) {
    return {
      state: "unknown",
      badgeLabel: "Desconocido",
      title: isLoading ? "Cargando plan actual" : "Plan todavía no disponible",
      detail: "El estado del plan aún no se ha confirmado.",
      durationWeeks: null,
      sessionCount: null,
    };
  }

  if (!assignment?.assignedPlan) {
    return {
      state: "none",
      badgeLabel: "Sin plan",
      title: "Sin plan asignado",
      detail: "Asigna un plan para iniciar el seguimiento.",
      durationWeeks: null,
      sessionCount: null,
    };
  }

  return {
    state: "assigned",
    badgeLabel: "Activo",
    title: assignment.assignedPlan.name,
    detail: `Desde ${formatClientPageDate(assignment.assignment.startDate) ?? "sin fecha"}`,
    durationWeeks: assignment.assignedPlan.durationWeeks,
    sessionCount: countSessions(assignment.assignedPlan),
  };
}

export function resolveClientPageAccessSummary(status: AccessStatus) {
  if (status === "active") {
    return {
      label: "Acceso activo",
      ctaLabel: "Gestionar acceso",
      variant: "access-active" as const,
    };
  }

  if (status === "temporarily_locked") {
    return {
      label: "Bloqueado temporalmente",
      ctaLabel: "Gestionar acceso",
      variant: "access-pending" as const,
    };
  }

  if (status === "disabled") {
    return {
      label: "Acceso desactivado",
      ctaLabel: "Gestionar acceso",
      variant: "inactive" as const,
    };
  }

  return {
    label: "Sin acceso",
    ctaLabel: "Generar acceso",
    variant: "no-plan" as const,
  };
}

function countSessions(plan: TrainingPlan) {
  return (plan.weeks ?? []).reduce(
    (total, week) =>
      total + (week.days ?? []).filter((day) => day.session).length,
    0,
  );
}

function formatClientPageDate(value: string | null | undefined) {
  if (!value) {
    return undefined;
  }

  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const date = dateOnlyMatch
    ? new Date(
        Number(dateOnlyMatch[1]),
        Number(dateOnlyMatch[2]) - 1,
        Number(dateOnlyMatch[3]),
      )
    : new Date(value);

  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}
