import assert from "node:assert/strict";
import test from "node:test";
import {
  beginClientStatusMutation,
  clientStatusActionsFor,
  failClientStatusMutation,
  finishClientStatusMutation,
  idleClientStatusMutationState,
} from "./client-status-state.ts";

test("does not include the current status as an action", () => {
  const actions = clientStatusActionsFor("active");

  assert.equal(actions.some((action) => action.status === "active"), false);
});

test("includes inactive as an available status change", () => {
  const actions = clientStatusActionsFor("active");

  assert.equal(actions.some((action) => action.status === "inactive"), true);
});

test("marks archive as a destructive action that requires confirmation", () => {
  const action = clientStatusActionsFor("active").find(
    (candidate) => candidate.status === "archived",
  );

  assert.equal(action?.isDestructive, true);
  assert.equal(action?.requiresConfirmation, true);
});

test("does not start a second mutation while one is pending", () => {
  const first = beginClientStatusMutation(idleClientStatusMutationState, {
    requestId: 1,
    clientId: "client-1",
    status: "paused",
    previousStatus: "active",
  });
  const second = beginClientStatusMutation(first.state, {
    requestId: 2,
    clientId: "client-1",
    status: "inactive",
    previousStatus: "active",
  });

  assert.equal(first.didStart, true);
  assert.equal(second.didStart, false);
  assert.equal(second.state, first.state);
});

test("does not let an obsolete response alter the current mutation", () => {
  const pending = beginClientStatusMutation(idleClientStatusMutationState, {
    requestId: 2,
    clientId: "client-1",
    status: "inactive",
    previousStatus: "active",
  }).state;

  const state = finishClientStatusMutation(pending, {
    requestId: 1,
    clientId: "client-1",
    status: "paused",
  });

  assert.equal(state, pending);
});

test("keeps the original status available after an error", () => {
  const pending = beginClientStatusMutation(idleClientStatusMutationState, {
    requestId: 1,
    clientId: "client-1",
    status: "paused",
    previousStatus: "active",
  }).state;

  const state = failClientStatusMutation(pending, {
    requestId: 1,
    clientId: "client-1",
    status: "paused",
    error: "No se pudo cambiar el estado.",
  });

  assert.equal(state.status, "error");
  assert.equal(state.previousStatus, "active");
  assert.equal(state.error, "No se pudo cambiar el estado.");
});

test("allows an archived client to be reactivated", () => {
  const actions = clientStatusActionsFor("archived");

  assert.equal(actions.some((action) => action.status === "active"), true);
});
