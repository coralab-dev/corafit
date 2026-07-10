import assert from "node:assert/strict";
import test from "node:test";
import {
  loadingClientDetailState,
  reduceClientDetailState,
  resolveClientDetailState,
  type ClientDetailLoadResult,
} from "./client-detail-state.ts";
import type { ClientDetailResponse } from "../../lib/clients/types.ts";

const baseClient: ClientDetailResponse = {
  id: "client-1",
  name: "Cliente uno",
  phone: null,
  age: null,
  sex: null,
  clientType: "online",
  mainGoal: "Fuerza",
  heightCm: 170,
  initialWeightKg: 70,
  trainingLevel: null,
  injuriesNotes: null,
  generalNotes: null,
  canRegisterWeight: true,
  operationalStatus: "active",
};

function createResult(
  overrides: Partial<ClientDetailLoadResult> = {},
): ClientDetailLoadResult {
  return {
    requestedClientId: "client-1",
    client: baseClient,
    access: null,
    assignment: null,
    ...overrides,
  };
}

test("uses exactly the client requested by the route", () => {
  const state = resolveClientDetailState(
    "client-2",
    createResult({
      requestedClientId: "client-2",
      client: { ...baseClient, id: "client-2", name: "Cliente dos" },
    }),
  );

  assert.equal(state?.status, "ready");
  assert.equal(state?.client?.id, "client-2");
  assert.equal(state?.client?.name, "Cliente dos");
});

test("does not use a first listed client as a detail fallback", () => {
  const state = resolveClientDetailState(
    "missing-client",
    createResult({ requestedClientId: "missing-client", client: null }),
  );

  assert.equal(state?.status, "not-found");
  assert.equal(state?.client, null);
});

test("returns not-found when the requested client does not exist", () => {
  const state = resolveClientDetailState(
    "missing-client",
    createResult({ requestedClientId: "missing-client", client: null }),
  );

  assert.deepEqual(state, {
    status: "not-found",
    client: null,
    assignment: null,
    error: null,
  });
});

test("keeps not-found as a terminal state", () => {
  const state = reduceClientDetailState(
    loadingClientDetailState,
    "missing-client",
    createResult({
      requestedClientId: "missing-client",
      client: null,
      notFound: true,
    }),
  );

  assert.equal(state.status, "not-found");
  assert.equal(state.client, null);
});

test("keeps errors terminal instead of converting them to loading", () => {
  const state = reduceClientDetailState(
    loadingClientDetailState,
    "client-1",
    createResult({
      client: null,
      error: "No se pudo cargar la ficha.",
    }),
  );

  assert.deepEqual(state, {
    status: "error",
    client: null,
    assignment: null,
    error: "No se pudo cargar la ficha.",
  });
});

test("normalizes and keeps an archived client returned by the direct endpoint", () => {
  const state = resolveClientDetailState(
    "archived-client",
    createResult({
      requestedClientId: "archived-client",
      client: {
        ...baseClient,
        id: "archived-client",
        operationalStatus: "archived",
      },
    }),
  );

  assert.equal(state?.status, "ready");
  assert.equal(state?.client?.id, "archived-client");
  assert.equal(state?.client?.operationalStatus, "archived");
});

test("ignores a response from an older navigation", () => {
  const state = resolveClientDetailState(
    "new-client",
    createResult({
      requestedClientId: "old-client",
      client: { ...baseClient, id: "old-client" },
    }),
  );

  assert.equal(state, null);
});

test("does not let an obsolete response alter the current state", () => {
  const currentState = {
    status: "loading" as const,
    client: null,
    assignment: null,
    error: null,
  };

  const state = reduceClientDetailState(
    currentState,
    "new-client",
    createResult({
      requestedClientId: "old-client",
      client: { ...baseClient, id: "old-client" },
    }),
  );

  assert.equal(state, currentState);
});

test("transitions from loading to ready", () => {
  const state = reduceClientDetailState(
    loadingClientDetailState,
    "client-1",
    createResult(),
  );

  assert.equal(state.status, "ready");
  assert.equal(state.client?.id, "client-1");
});
