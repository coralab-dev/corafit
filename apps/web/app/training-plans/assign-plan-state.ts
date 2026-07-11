import type { Client } from "@/lib/clients/types";

export type AssignableClientDialogState =
  | "all-assigned"
  | "available"
  | "empty"
  | "error"
  | "loading";

export function getClientsAvailableForAssignment(clients: Client[]): Client[] {
  return clients.filter((client) => client.currentAssignment === null);
}

export function getAssignableClientDialogState(
  clients: Client[],
  error: string,
  isLoading: boolean,
): AssignableClientDialogState {
  if (isLoading) {
    return "loading";
  }

  if (error) {
    return "error";
  }

  if (!clients.length) {
    return "empty";
  }

  if (getClientsAvailableForAssignment(clients).length === 0) {
    return "all-assigned";
  }

  return "available";
}
