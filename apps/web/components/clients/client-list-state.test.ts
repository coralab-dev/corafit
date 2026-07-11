import assert from "node:assert/strict";
import test from "node:test";
import {
  getClientsForStatusFilter,
  getMetricClients,
  mergeClientCollections,
} from "./client-list-state.ts";
import type { Client } from "../../lib/clients/types.ts";

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

test("all filter excludes archived clients", () => {
  const clients = [
    createClient({ id: "active", operationalStatus: "active" }),
    createClient({ id: "archived", operationalStatus: "archived" }),
  ];

  assert.deepEqual(
    getClientsForStatusFilter(clients, "all").map((client) => client.id),
    ["active"],
  );
});

test("archived filter includes only archived clients", () => {
  const clients = [
    createClient({ id: "active", operationalStatus: "active" }),
    createClient({ id: "archived", operationalStatus: "archived" }),
  ];

  assert.deepEqual(
    getClientsForStatusFilter(clients, "archived").map((client) => client.id),
    ["archived"],
  );
});

test("merge does not duplicate clients", () => {
  const merged = mergeClientCollections(
    [createClient({ id: "client-1", name: "Operativo" })],
    [createClient({ id: "client-1", name: "Archivado", operationalStatus: "archived" })],
  );

  assert.equal(merged.length, 1);
  assert.equal(merged[0]?.name, "Archivado");
});

test("archiving moves a client to the archived filter", () => {
  const clients = [createClient({ id: "client-1", operationalStatus: "archived" })];

  assert.equal(getClientsForStatusFilter(clients, "all").length, 0);
  assert.equal(getClientsForStatusFilter(clients, "archived").length, 1);
});

test("reactivating removes a client from archived", () => {
  const clients = [createClient({ id: "client-1", operationalStatus: "active" })];

  assert.equal(getClientsForStatusFilter(clients, "archived").length, 0);
  assert.equal(getClientsForStatusFilter(clients, "active").length, 1);
});

test("metrics exclude archived clients", () => {
  const clients = [
    createClient({ id: "active", operationalStatus: "active" }),
    createClient({ id: "archived", operationalStatus: "archived" }),
  ];

  assert.deepEqual(
    getMetricClients(clients).map((client) => client.id),
    ["active"],
  );
});
