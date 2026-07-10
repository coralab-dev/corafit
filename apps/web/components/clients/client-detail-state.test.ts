import assert from "node:assert/strict";
import test from "node:test";
import {
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
