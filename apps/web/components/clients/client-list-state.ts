import type { Client, OperationalStatus } from "../../lib/clients/types.ts";

export type ClientStatusFilter = OperationalStatus | "all";

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
