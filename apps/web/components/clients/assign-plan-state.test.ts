import { describe, expect, it } from "vitest";
import type { Client, TrainingPlan } from "../../lib/clients/types";
import {
  canConfirmAssignment,
  createAssignmentInitialState,
  getAssignmentEndDate,
  getPlanListFacts,
  getWeekPreview,
  resolvePlanDetailSuccess,
  selectPlanSummary,
} from "./assign-plan-state";

function createClient(overrides: Partial<Client> = {}): Client {
  return {
    id: "client-1",
    name: "Juan Perez",
    phone: "",
    age: 34,
    sex: "",
    clientType: "online",
    mainGoal: "Fuerza",
    heightCm: 178,
    initialWeightKg: 82,
    trainingLevel: "",
    injuriesNotes: "",
    generalNotes: "",
    canRegisterWeight: true,
    operationalStatus: "active",
    access: { status: "none" },
    currentAssignment: null,
    ...overrides,
  };
}

const activeAssignment = {
  assignment: {
    id: "assignment-1",
    assignedPlanId: "assigned-plan-1",
    sourceTrainingPlanId: "plan-1",
    startDate: "2026-08-12",
    endedAt: null,
    status: "active" as const,
  },
  assignedPlan: null,
  sourcePlan: null,
};

function createPlan(overrides: Partial<TrainingPlan> = {}): TrainingPlan {
  return {
    id: "plan-1",
    name: "Athletic Warm",
    goal: "Hipertrofia",
    level: "intermediate",
    durationWeeks: 4,
    generalNotes: null,
    planType: "template",
    status: "active",
    isSystemTemplate: false,
    weeks: [
      {
        id: "week-1",
        weekNumber: 1,
        notes: null,
        days: [
          {
            id: "day-1",
            dayOfWeek: "wednesday",
            dayOrder: 1,
            dayType: "training",
            session: {
              id: "session-1",
              name: "Push",
              description: "Empuje de torso",
              coachNote: "Controla el tempo.",
              exercises: [
                {
                  id: "exercise-1",
                  orderIndex: 2,
                  sets: 3,
                  reps: "10-12",
                  restSeconds: 60,
                  coachNote: null,
                  exercise: { id: "incline", name: "Press inclinado" },
                  alternatives: [],
                },
                {
                  id: "exercise-2",
                  orderIndex: 1,
                  sets: 4,
                  reps: "8-10",
                  restSeconds: 90,
                  coachNote: null,
                  exercise: { id: "bench", name: "Press de banca" },
                  alternatives: [{ id: "alt-1", note: null }],
                },
              ],
            },
          },
          {
            id: "day-2",
            dayOfWeek: "thursday",
            dayOrder: 2,
            dayType: "rest",
            session: null,
          },
        ],
      },
      {
        id: "week-2",
        weekNumber: 2,
        notes: null,
        days: [
          {
            id: "day-8",
            dayOfWeek: "wednesday",
            dayOrder: 1,
            dayType: "training",
            session: {
              id: "session-8",
              name: "Pull",
              description: null,
              coachNote: null,
              exercises: [],
            },
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe("assign plan workspace state", () => {
  it("does not select the first plan automatically", () => {
    const state = createAssignmentInitialState({
      initialStartDate: "2026-08-12",
      plans: [createPlan()],
    });

    expect(state.selectedPlanSummary).toBeNull();
    expect(state.selectedPlanDetail).toBeNull();
  });

  it("list facts only use fields available in the list response", () => {
    expect(getPlanListFacts(createPlan({ weeks: undefined }))).toEqual({
      badge: "Mi plan",
      duration: "4 semanas",
      goal: "Hipertrofia",
      level: "Intermedio",
      name: "Athletic Warm",
    });
  });

  it("maps a Wednesday start date to a Wednesday through Tuesday preview", () => {
    const preview = getWeekPreview(createPlan(), 1, "2026-08-12");

    expect(preview?.days.map((day) => `${day.shortLabel} ${day.dayNumber}`)).toEqual([
      "Mié 12",
      "Jue 13",
      "Vie 14",
      "Sáb 15",
      "Dom 16",
      "Lun 17",
      "Mar 18",
    ]);
    expect(preview?.rangeLabel).toBe("12–18 de agosto");
  });

  it("uses the selected week structure when changing weeks", () => {
    const preview = getWeekPreview(createPlan(), 2, "2026-08-12");

    expect(preview?.weekNumber).toBe(2);
    expect(preview?.days[0]?.session?.name).toBe("Pull");
  });

  it("calculates an inclusive end date with duration x 7 minus 1", () => {
    expect(getAssignmentEndDate(createPlan({ durationWeeks: 4 }), "2026-08-12")).toBe(
      "2026-09-08",
    );
  });

  it("sorts exercise details and exposes alternatives", () => {
    const trainingDay = getWeekPreview(createPlan(), 1, "2026-08-12")?.days[0];

    expect(trainingDay?.exerciseCount).toBe(2);
    expect(trainingDay?.exercises.map((exercise) => exercise.name)).toEqual([
      "Press de banca",
      "Press inclinado",
    ]);
    expect(trainingDay?.exercises[0]?.hasAlternatives).toBe(true);
  });

  it("represents rest days without a session label", () => {
    const restDay = getWeekPreview(createPlan(), 1, "2026-08-12")?.days[1];

    expect(restDay?.isRest).toBe(true);
    expect(restDay?.session).toBeNull();
  });

  it("ignores an old plan detail response after a newer selection", () => {
    const first = selectPlanSummary(
      createAssignmentInitialState({ initialStartDate: "2026-08-12" }),
      createPlan({ id: "plan-old" }),
      1,
    );
    const second = selectPlanSummary(first, createPlan({ id: "plan-new" }), 2);

    expect(
      resolvePlanDetailSuccess(second, {
        detail: createPlan({ id: "plan-old" }),
        requestId: 1,
      }),
    ).toBe(second);
  });

  it("disables confirmation when the client already has an active assignment", () => {
    expect(
      canConfirmAssignment({
        client: createClient({ currentAssignment: activeAssignment }),
        selectedPlanId: "plan-1",
        startDate: "2026-08-12",
        isPlanDetailLoading: false,
        previewError: "",
        isAssigning: false,
      }),
    ).toBe(false);
  });

  it("disables confirmation when date is missing or preview failed", () => {
    const base = {
      client: createClient(),
      selectedPlanId: "plan-1",
      isPlanDetailLoading: false,
      isAssigning: false,
    };

    expect(canConfirmAssignment({ ...base, startDate: "", previewError: "" })).toBe(false);
    expect(
      canConfirmAssignment({
        ...base,
        startDate: "2026-08-12",
        previewError: "No se pudo cargar",
      }),
    ).toBe(false);
  });
});
