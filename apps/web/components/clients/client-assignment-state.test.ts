import { assert, test } from "vitest";
import type { CurrentPlanAssignment } from "../../lib/clients/types";
import {
  beginClientAssignmentLoad,
  confirmClientAssignmentEnded,
  failClientAssignmentLoad,
  idleClientAssignmentState,
  invalidateClientAssignmentLoad,
  resolveClientAssignmentLoadDecision,
  resolveClientAssignmentSuccess,
  type ClientAssignmentState,
} from "./client-assignment-state";

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
  },
} as CurrentPlanAssignment;

function loadingState(
  clientId: string,
  requestId: number,
  knownAssignment?: CurrentPlanAssignment | null,
): ClientAssignmentState {
  return beginClientAssignmentLoad(idleClientAssignmentState, {
    clientId,
    requestId,
    knownAssignment,
  });
}

test("starts a loading request for client A", () => {
  assert.deepEqual(loadingState("client-a", 1), {
    status: "loading",
    clientId: "client-a",
    assignment: undefined,
    error: null,
    requestId: 1,
  });
});

test("treats an existing null assignment key as confirmed absence", () => {
  const decision = resolveClientAssignmentLoadDecision({
    assignmentsByClient: { "client-a": null },
    clientId: "client-a",
  });

  assert.deepEqual(decision, {
    shouldFetch: false,
    knownAssignment: null,
  });
});

test("treats a missing assignment key as unknown", () => {
  const decision = resolveClientAssignmentLoadDecision({
    assignmentsByClient: {},
    clientId: "client-a",
  });

  assert.deepEqual(decision, {
    shouldFetch: true,
    knownAssignment: undefined,
  });
});

test("uses a known assignment while still allowing a refresh", () => {
  const decision = resolveClientAssignmentLoadDecision({
    assignmentsByClient: { "client-a": assignment },
    clientId: "client-a",
  });

  assert.deepEqual(decision, {
    shouldFetch: true,
    knownAssignment: assignment,
  });
});

test("accepts a current success for client A", () => {
  const state = resolveClientAssignmentSuccess(
    loadingState("client-a", 1),
    { clientId: "client-a", requestId: 1, assignment },
  );

  assert.equal(state.status, "ready");
  assert.equal(state.clientId, "client-a");
  assert.equal(state.assignment, assignment);
  assert.equal(state.error, null);
});

test("accepts a current null result as confirmed absence of a plan", () => {
  const state = resolveClientAssignmentSuccess(
    loadingState("client-a", 1),
    { clientId: "client-a", requestId: 1, assignment: null },
  );

  assert.equal(state.status, "ready");
  assert.equal(state.assignment, null);
  assert.equal(state.error, null);
});

test("keeps the last assignment when a refresh fails", () => {
  const state = failClientAssignmentLoad(
    beginClientAssignmentLoad(
      resolveClientAssignmentSuccess(
        loadingState("client-a", 1),
        { clientId: "client-a", requestId: 1, assignment },
      ),
      { clientId: "client-a", requestId: 2 },
    ),
    {
      clientId: "client-a",
      requestId: 2,
      error: "No se pudo cargar el plan actual.",
    },
  );

  assert.equal(state.status, "error");
  assert.equal(state.assignment, assignment);
  assert.equal(state.error, "No se pudo cargar el plan actual.");
});

test("ignores an old response for A after selecting B", () => {
  const stateForB = beginClientAssignmentLoad(
    loadingState("client-a", 1),
    { clientId: "client-b", requestId: 2 },
  );

  const state = resolveClientAssignmentSuccess(
    stateForB,
    { clientId: "client-a", requestId: 1, assignment },
  );

  assert.equal(state, stateForB);
});

test("ignores an old response after the drawer closes", () => {
  const closedState = invalidateClientAssignmentLoad(loadingState("client-a", 1));

  const state = resolveClientAssignmentSuccess(
    closedState,
    { clientId: "client-a", requestId: 1, assignment },
  );

  assert.equal(state, idleClientAssignmentState);
});

test("ending a plan invalidates the previous request and fixes null", () => {
  const invalidated = invalidateClientAssignmentLoad(
    loadingState("client-a", 7, assignment),
  );
  const ended = confirmClientAssignmentEnded(invalidated, "client-a");

  assert.deepEqual(ended, {
    status: "ready",
    clientId: "client-a",
    assignment: null,
    error: null,
    requestId: null,
  });
});

test("a response from before finalization cannot restore the plan", () => {
  const ended = confirmClientAssignmentEnded(
    loadingState("client-a", 7, assignment),
    "client-a",
  );

  const state = resolveClientAssignmentSuccess(
    ended,
    { clientId: "client-a", requestId: 7, assignment },
  );

  assert.equal(state, ended);
});

test("an intentional abort does not become a user-visible error", () => {
  const loading = loadingState("client-a", 1);
  const state = failClientAssignmentLoad(loading, {
    clientId: "client-a",
    requestId: 1,
    error: "AbortError",
    aborted: true,
  });

  assert.equal(state, loading);
});

test("retry starts a new request and clears the previous error", () => {
  const failed = failClientAssignmentLoad(
    loadingState("client-a", 1, assignment),
    {
      clientId: "client-a",
      requestId: 1,
      error: "No se pudo cargar el plan actual.",
    },
  );

  const retried = beginClientAssignmentLoad(failed, {
    clientId: "client-a",
    requestId: 2,
  });

  assert.deepEqual(retried, {
    status: "loading",
    clientId: "client-a",
    assignment,
    error: null,
    requestId: 2,
  });
});
