import { assert, test } from "vitest";
import type { CurrentPlanAssignment } from "../../lib/clients/types.ts";
import {
  resolveClientPageAccessSummary,
  resolveClientPagePlanSummary,
} from "./client-page-summary.ts";

const assignment = {
  assignment: {
    id: "assignment-a",
    assignedPlanId: "plan-a",
    sourceTrainingPlanId: "template-a",
    startDate: "2026-07-01",
    endedAt: null,
    status: "active",
  },
  sourcePlan: { id: "template-a", name: "Template A" },
  assignedPlan: {
    id: "plan-a",
    name: "Plan A",
    goal: "Fuerza",
    level: "intermediate",
    durationWeeks: 8,
    generalNotes: null,
    planType: "assigned_copy",
    status: "active",
    weeks: [
      {
        id: "week-a",
        weekNumber: 1,
        notes: null,
        days: [
          {
            id: "day-a",
            dayOfWeek: "monday",
            dayOrder: 1,
            dayType: "training",
            session: {
              id: "session-a",
              name: "Fuerza A",
              description: null,
              coachNote: null,
            },
          },
        ],
      },
    ],
  },
} as CurrentPlanAssignment;

test("distinguishes unknown, error, empty, and assigned plan summary states", () => {
  assert.deepEqual(resolveClientPagePlanSummary(undefined, false, null), {
    state: "unknown",
    badgeLabel: "Desconocido",
    title: "Plan todavia no disponible",
    detail: "El estado del plan aun no se ha confirmado.",
    durationWeeks: null,
    sessionCount: null,
  });

  assert.deepEqual(resolveClientPagePlanSummary(undefined, false, "Fallo"), {
    state: "error",
    badgeLabel: "Error",
    title: "No se pudo cargar el plan actual",
    detail: "Fallo",
    durationWeeks: null,
    sessionCount: null,
  });

  assert.deepEqual(resolveClientPagePlanSummary(null, false, null), {
    state: "none",
    badgeLabel: "Sin plan",
    title: "Sin plan asignado",
    detail: "Asigna un plan para iniciar el seguimiento.",
    durationWeeks: null,
    sessionCount: null,
  });

  assert.deepEqual(resolveClientPagePlanSummary(assignment, false, null), {
    state: "assigned",
    badgeLabel: "Activo",
    title: "Plan A",
    detail: "Desde 01 jul 2026",
    durationWeeks: 8,
    sessionCount: 1,
  });
});

test("uses explicit access labels for the client page summary", () => {
  assert.deepEqual(resolveClientPageAccessSummary("active"), {
    label: "Acceso activo",
    variant: "access-active",
  });
  assert.deepEqual(resolveClientPageAccessSummary("none"), {
    label: "Pendiente",
    variant: "no-plan",
  });
});
