import type { TrainingPlanStatus } from "@/hooks/use-training-plans";

export type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";
export type EditorPrimaryAction =
  | "publish"
  | "unpublish"
  | "duplicate-template"
  | "duplicate-archived";
export type PrescriptionField = "sets" | "reps" | "restSeconds";

export function mergeSessionExerciseUpdate<T extends object>(
  current: T,
  response: T,
  requestedFields: Partial<T>,
): T {
  const merged = { ...current };

  for (const key of Object.keys(requestedFields) as Array<keyof T>) {
    merged[key] = response[key];
  }

  return merged;
}

type EditorContextPlan = {
  isSystemTemplate?: boolean;
  status: TrainingPlanStatus;
};

type PublicationPlan = {
  weeks?: Array<{
    days: Array<{
      session: { exercises?: unknown[] } | null;
    }>;
  }>;
};

export function getEditorContext(plan: EditorContextPlan): {
  isReadOnly: boolean;
  primaryAction: EditorPrimaryAction;
  title: string;
} {
  if (plan.isSystemTemplate) {
    return {
      isReadOnly: true,
      primaryAction: "duplicate-template",
      title: "Ver plantilla",
    };
  }

  if (plan.status === "archived") {
    return {
      isReadOnly: true,
      primaryAction: "duplicate-archived",
      title: "Ver plan archivado",
    };
  }

  if (plan.status === "active") {
    return {
      isReadOnly: true,
      primaryAction: "unpublish",
      title: "Ver plan",
    };
  }

  return {
    isReadOnly: false,
    primaryAction: "publish",
    title: "Editar plan",
  };
}

export function getPublicationChecklist(plan: PublicationPlan): {
  canPublish: boolean;
  emptySessionCount: number;
  hasSessions: boolean;
  hasWeeks: boolean;
} {
  const weeks = plan.weeks ?? [];
  const sessions = weeks.flatMap((week) =>
    week.days.flatMap((day) => (day.session ? [day.session] : [])),
  );
  const hasWeeks = weeks.length > 0;
  const hasSessions = sessions.length > 0;

  return {
    canPublish: hasWeeks && hasSessions,
    emptySessionCount: sessions.filter(
      (session) => (session.exercises?.length ?? 0) === 0,
    ).length,
    hasSessions,
    hasWeeks,
  };
}

export function getSaveStateLabel(state: SaveState) {
  const labels: Record<SaveState, string> = {
    dirty: "Cambios pendientes.",
    error: "Error al guardar.",
    idle: "Cambios guardados.",
    saved: "Cambios guardados.",
    saving: "Guardando…",
  };

  return labels[state];
}

export function parsePrescriptionUpdate(
  field: PrescriptionField,
  input: string,
  currentValue: number | string | null,
):
  | { changed: boolean; error: null; value: number | string | null }
  | { changed: false; error: string } {
  if (field === "reps") {
    const value = input.trim();
    if (!value) {
      return {
        changed: false,
        error: "Las repeticiones no pueden quedar vacías.",
      };
    }

    return { changed: value !== currentValue, error: null, value };
  }

  const normalizedInput = input.trim();
  if (!normalizedInput) {
    return {
      changed: currentValue !== null,
      error: null,
      value: null,
    };
  }

  const value = Number(normalizedInput);
  if (!Number.isInteger(value) || value <= 0) {
    return {
      changed: false,
      error: "Usa un entero positivo o deja el campo vacío.",
    };
  }

  return { changed: value !== currentValue, error: null, value };
}
