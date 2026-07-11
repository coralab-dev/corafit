import type {
  Client,
  CurrentPlanAssignment,
  OperationalStatus,
} from "../../lib/clients/types.ts";

export type ClientStatusFilter = OperationalStatus | "all";

export type ClientOperationalMetrics = {
  totalCount: number;
  activeCount: number;
  pausedInactiveCount: number;
  assignmentCount: number;
  accessCount: number;
};

export function mergeClientCollections(
  operationalClients: Client[],
  archivedClients: Client[],
): Client[] {
  const clientsById = new Map<string, Client>();

  for (const client of operationalClients) {
    clientsById.set(client.id, client);
  }

  for (const client of archivedClients) {
    clientsById.set(client.id, client);
  }

  return Array.from(clientsById.values());
}

export function getClientsForStatusFilter(
  clients: Client[],
  statusFilter: ClientStatusFilter,
): Client[] {
  if (statusFilter === "all") {
    return clients.filter((client) => client.operationalStatus !== "archived");
  }

  return clients.filter((client) => client.operationalStatus === statusFilter);
}

export function getMetricClients(clients: Client[]): Client[] {
  return clients.filter((client) => client.operationalStatus !== "archived");
}

export function getOperationalClientMetrics(
  clients: Client[],
  assignmentsByClient: Record<string, CurrentPlanAssignment | null | undefined> = {},
): ClientOperationalMetrics {
  const metricClients = getMetricClients(clients);

  return {
    totalCount: metricClients.length,
    activeCount: metricClients.filter(
      (client) => client.operationalStatus === "active",
    ).length,
    pausedInactiveCount: metricClients.filter(
      (client) =>
        client.operationalStatus === "paused" ||
        client.operationalStatus === "inactive",
    ).length,
    assignmentCount: metricClients.filter((client) => {
      const hasExplicitAssignment = Object.prototype.hasOwnProperty.call(
        assignmentsByClient,
        client.id,
      );
      return Boolean(
        hasExplicitAssignment
          ? assignmentsByClient[client.id]
          : client.currentAssignment,
      );
    }).length,
    accessCount: metricClients.filter((client) => client.access.status === "active").length,
  };
}
