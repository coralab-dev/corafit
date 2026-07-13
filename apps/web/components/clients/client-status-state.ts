import type { OperationalStatus } from "../../lib/clients/types.ts";

export type ClientStatusAction = {
  status: OperationalStatus;
  label: string;
  isDestructive: boolean;
  requiresConfirmation: boolean;
};

export type ClientStatusMutationTarget = {
  requestId: number;
  clientId: string;
  status: OperationalStatus;
};

export type ClientStatusMutationState =
  | {
      status: "idle";
      requestId: null;
      clientId: null;
      targetStatus: null;
      previousStatus: null;
      error: null;
    }
  | {
      status: "pending";
      requestId: number;
      clientId: string;
      targetStatus: OperationalStatus;
      previousStatus: OperationalStatus;
      error: null;
    }
  | {
      status: "error";
      requestId: number;
      clientId: string;
      targetStatus: OperationalStatus;
      previousStatus: OperationalStatus;
      error: string;
    };

export const idleClientStatusMutationState: ClientStatusMutationState = {
  status: "idle",
  requestId: null,
  clientId: null,
  targetStatus: null,
  previousStatus: null,
  error: null,
};

const clientStatusActions: ClientStatusAction[] = [
  {
    status: "active",
    label: "Activar",
    isDestructive: false,
    requiresConfirmation: false,
  },
  {
    status: "paused",
    label: "Pausar",
    isDestructive: false,
    requiresConfirmation: false,
  },
  {
    status: "inactive",
    label: "Marcar inactivo",
    isDestructive: false,
    requiresConfirmation: false,
  },
  {
    status: "archived",
    label: "Archivar",
    isDestructive: true,
    requiresConfirmation: true,
  },
];

export function clientStatusActionsFor(
  currentStatus: OperationalStatus,
): ClientStatusAction[] {
  return clientStatusActions.filter((action) => action.status !== currentStatus);
}

export function beginClientStatusMutation(
  currentState: ClientStatusMutationState,
  target: ClientStatusMutationTarget & { previousStatus: OperationalStatus },
): { didStart: boolean; state: ClientStatusMutationState } {
  if (currentState.status === "pending") {
    return { didStart: false, state: currentState };
  }

  return {
    didStart: true,
    state: {
      status: "pending",
      requestId: target.requestId,
      clientId: target.clientId,
      targetStatus: target.status,
      previousStatus: target.previousStatus,
      error: null,
    },
  };
}

export function finishClientStatusMutation(
  currentState: ClientStatusMutationState,
  target: ClientStatusMutationTarget,
): ClientStatusMutationState {
  if (!matchesCurrentMutation(currentState, target)) {
    return currentState;
  }

  return idleClientStatusMutationState;
}

export function failClientStatusMutation(
  currentState: ClientStatusMutationState,
  target: ClientStatusMutationTarget & { error: string },
): ClientStatusMutationState {
  if (!matchesCurrentMutation(currentState, target)) {
    return currentState;
  }

  return {
    status: "error",
    requestId: target.requestId,
    clientId: target.clientId,
    targetStatus: target.status,
    previousStatus: currentState.previousStatus,
    error: target.error,
  };
}

export function matchesCurrentMutation(
  currentState: ClientStatusMutationState,
  target: ClientStatusMutationTarget,
): currentState is Extract<ClientStatusMutationState, { status: "pending" }> {
  return (
    currentState.status === "pending" &&
    currentState.requestId === target.requestId &&
    currentState.clientId === target.clientId &&
    currentState.targetStatus === target.status
  );
}

export function isClientStatusMutationPending(
  currentState: ClientStatusMutationState,
  clientId: string,
): boolean {
  return currentState.status === "pending" && currentState.clientId === clientId;
}

export function getClientStatusMutationError(
  currentState: ClientStatusMutationState,
  clientId: string | null | undefined,
  status: OperationalStatus,
): string | null {
  if (
    currentState.status !== "error" ||
    !clientId ||
    currentState.clientId !== clientId ||
    currentState.targetStatus !== status
  ) {
    return null;
  }

  return currentState.error;
}

export function clearClientStatusMutationError(
  currentState: ClientStatusMutationState,
): ClientStatusMutationState {
  return currentState.status === "error" ? idleClientStatusMutationState : currentState;
}
