import { describe, expect, it } from "vitest";
import {
  canSubmitPlanAssignment,
  getAssignableClientDialogState,
  getClientsAvailableForAssignment,
  isClientAvailableForAssignment,
} from "./assign-plan-state";
import type { Client } from "@/lib/clients/types";

function createClient(overrides: Partial<Client> = {}): Client {
  return {
    id: "client-1",
    name: "Cliente",
    phone: "",
    age: 30,
    sex: "",
    clientType: "online",
    mainGoal: "Fuerza",
    heightCm: 170,
    initialWeightKg: 70,
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

const assignment = {
  assignment: {
    id: "assignment-1",
    assignedPlanId: "assigned-plan-1",
    sourceTrainingPlanId: "source-plan-1",
    startDate: "2026-01-01",
    endedAt: null,
    status: "active" as const,
  },
  assignedPlan: {
    id: "assigned-plan-1",
    name: "Plan activo",
    goal: null,
    level: null,
    durationWeeks: 4,
    generalNotes: null,
    planType: "assigned_copy" as const,
    status: "active" as const,
  },
  sourcePlan: null,
};

describe("assign plan dialog state", () => {
  it("returns available only when the current assignment is explicitly null", () => {
    expect(isClientAvailableForAssignment(createClient({ currentAssignment: null }))).toBe(true);
    expect(isClientAvailableForAssignment(createClient({ currentAssignment: assignment }))).toBe(false);
    expect(isClientAvailableForAssignment(createClient({ currentAssignment: undefined }))).toBe(false);
  });

  it("only enables clients whose current assignment is known to be empty", () => {
    const clients = [
      createClient({ id: "with-plan", currentAssignment: assignment }),
      createClient({ id: "without-plan", currentAssignment: null }),
    ];

    expect(getClientsAvailableForAssignment(clients).map((client) => client.id)).toEqual([
      "without-plan",
    ]);
  });

  it("keeps clients from multiple pages eligible when they have no assignment", () => {
    const clients = [
      createClient({ id: "page-one", currentAssignment: null }),
      createClient({ id: "page-two", currentAssignment: null }),
    ];

    expect(getClientsAvailableForAssignment(clients)).toHaveLength(2);
  });

  it("distinguishes no clients, all assigned, load error, and available clients", () => {
    expect(getAssignableClientDialogState([], "", false)).toBe("empty");
    expect(
      getAssignableClientDialogState(
        [createClient({ currentAssignment: assignment })],
        "",
        false,
      ),
    ).toBe("all-assigned");
    expect(getAssignableClientDialogState([], "No se pudo cargar", false)).toBe("error");
    expect(
      getAssignableClientDialogState(
        [createClient({ currentAssignment: null })],
        "",
        false,
      ),
    ).toBe("available");
  });

  it("does not allow assignment submission for blocked clients", () => {
    expect(canSubmitPlanAssignment(createClient({ currentAssignment: null }), "plan-1")).toBe(true);
    expect(canSubmitPlanAssignment(createClient({ currentAssignment: assignment }), "plan-1")).toBe(false);
    expect(canSubmitPlanAssignment(createClient({ currentAssignment: undefined }), "plan-1")).toBe(false);
    expect(canSubmitPlanAssignment(createClient({ currentAssignment: null }), "")).toBe(false);
  });
});
