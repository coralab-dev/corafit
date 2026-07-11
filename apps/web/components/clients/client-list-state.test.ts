import { assert, test } from "vitest";
import {
  getClientsForStatusFilter,
  getOperationalClientMetrics,
  getMetricClients,
  mergeClientCollections,
} from "./client-list-state.ts";
import type { Client } from "../../lib/clients/types.ts";

const assignedPlan = {
  assignment: {
    id: "assignment-1",
    assignedPlanId: "assigned-plan-1",
    sourceTrainingPlanId: "source-plan-1",
    startDate: "2026-01-01",
    endedAt: null,
    status: "active" as const,
  },
  assignedPlan: null,
  sourcePlan: null,
};

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

test("metric total excludes archived clients", () => {
  const metrics = getOperationalClientMetrics([
    createClient({ id: "active", operationalStatus: "active" }),
    createClient({ id: "inactive", operationalStatus: "inactive" }),
    createClient({ id: "archived", operationalStatus: "archived" }),
  ]);

  assert.equal(metrics.totalCount, 2);
});

test("metric percentages share the operational denominator", () => {
  const archivedAssignment = {
    assignment: {
      id: "assignment-2",
      assignedPlanId: "assigned-plan-2",
      sourceTrainingPlanId: "source-plan-2",
      startDate: "2026-01-01",
      endedAt: null,
      status: "active" as const,
    },
    assignedPlan: null,
    sourcePlan: null,
  };
  const metrics = getOperationalClientMetrics(
    [
      createClient({
        id: "active-with-plan-and-access",
        operationalStatus: "active",
        access: { status: "active" },
      }),
      createClient({ id: "inactive", operationalStatus: "inactive" }),
      createClient({
        id: "archived-with-plan-and-access",
        operationalStatus: "archived",
        access: { status: "active" },
      }),
    ],
    {
      "active-with-plan-and-access": assignedPlan,
      "archived-with-plan-and-access": archivedAssignment,
    },
  );

  assert.deepEqual(metrics, {
    totalCount: 2,
    activeCount: 1,
    pausedInactiveCount: 1,
    assignmentCount: 1,
    accessCount: 1,
  });
});

test("explicit null assignment overrides a stale current assignment", () => {
  const metrics = getOperationalClientMetrics(
    [
      createClient({
        id: "client-1",
        currentAssignment: assignedPlan,
      }),
    ],
    { "client-1": null },
  );

  assert.equal(metrics.assignmentCount, 0);
});

test("missing assignment key falls back to the client current assignment", () => {
  const metrics = getOperationalClientMetrics([
    createClient({
      id: "client-1",
      currentAssignment: assignedPlan,
    }),
  ]);

  assert.equal(metrics.assignmentCount, 1);
});

test("transient assignment refresh failures keep metrics on the last known assignment", () => {
  const assignmentsByClient = { "client-1": assignedPlan };
  const metrics = getOperationalClientMetrics(
    [
      createClient({
        id: "client-1",
        currentAssignment: assignedPlan,
      }),
    ],
    assignmentsByClient,
  );

  assert.equal(metrics.assignmentCount, 1);
});

test("ending a plan immediately reduces assignment count", () => {
  const metrics = getOperationalClientMetrics(
    [
      createClient({
        id: "client-1",
        currentAssignment: assignedPlan,
      }),
      createClient({
        id: "client-2",
        currentAssignment: assignedPlan,
      }),
    ],
    {
      "client-1": null,
      "client-2": assignedPlan,
    },
  );

  assert.equal(metrics.assignmentCount, 1);
});

test("archived clients with plans stay excluded from assignment metrics", () => {
  const metrics = getOperationalClientMetrics(
    [
      createClient({
        id: "active",
        currentAssignment: null,
      }),
      createClient({
        id: "archived",
        operationalStatus: "archived",
        currentAssignment: assignedPlan,
      }),
    ],
    {
      archived: assignedPlan,
    },
  );

  assert.equal(metrics.assignmentCount, 0);
});
