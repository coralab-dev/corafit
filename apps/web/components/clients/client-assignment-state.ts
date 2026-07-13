import type { CurrentPlanAssignment } from "../../lib/clients/types";

export type ClientAssignmentState = {
  status: "idle" | "loading" | "ready" | "error";
  clientId: string | null;
  assignment: CurrentPlanAssignment | null | undefined;
  error: string | null;
  requestId: number | null;
};

export const idleClientAssignmentState: ClientAssignmentState = {
  status: "idle",
  clientId: null,
  assignment: undefined,
  error: null,
  requestId: null,
};

export function resolveClientAssignmentLoadDecision({
  assignmentsByClient,
  clientId,
}: {
  assignmentsByClient: Record<string, CurrentPlanAssignment | null>;
  clientId: string;
}): {
  shouldFetch: boolean;
  knownAssignment: CurrentPlanAssignment | null | undefined;
} {
  const hasKnownAssignment = Object.prototype.hasOwnProperty.call(
    assignmentsByClient,
    clientId,
  );
  const knownAssignment = hasKnownAssignment
    ? assignmentsByClient[clientId]
    : undefined;

  return {
    shouldFetch: knownAssignment !== null,
    knownAssignment,
  };
}

export function beginClientAssignmentLoad(
  state: ClientAssignmentState,
  {
    clientId,
    knownAssignment,
    requestId,
  }: {
    clientId: string;
    knownAssignment?: CurrentPlanAssignment | null;
    requestId: number;
  },
): ClientAssignmentState {
  const assignment =
    state.clientId === clientId && state.assignment !== undefined
      ? state.assignment
      : knownAssignment;

  return {
    status: "loading",
    clientId,
    assignment,
    error: null,
    requestId,
  };
}

export function resolveClientAssignmentSuccess(
  state: ClientAssignmentState,
  {
    assignment,
    clientId,
    requestId,
  }: {
    assignment: CurrentPlanAssignment | null;
    clientId: string;
    requestId: number;
  },
): ClientAssignmentState {
  if (!matchesClientAssignmentRequest(state, clientId, requestId)) {
    return state;
  }

  return {
    status: "ready",
    clientId,
    assignment,
    error: null,
    requestId: null,
  };
}

export function failClientAssignmentLoad(
  state: ClientAssignmentState,
  {
    clientId,
    error,
    requestId,
    aborted = false,
  }: {
    clientId: string;
    error: string;
    requestId: number;
    aborted?: boolean;
  },
): ClientAssignmentState {
  if (aborted || !matchesClientAssignmentRequest(state, clientId, requestId)) {
    return state;
  }

  return {
    status: "error",
    clientId,
    assignment: state.assignment,
    error,
    requestId: null,
  };
}

export function invalidateClientAssignmentLoad(
  state: ClientAssignmentState = idleClientAssignmentState,
): ClientAssignmentState {
  return state.status === "idle" && state.clientId === null
    ? state
    : idleClientAssignmentState;
}

export function confirmClientAssignmentEnded(
  state: ClientAssignmentState,
  clientId: string,
): ClientAssignmentState {
  return confirmClientAssignmentAbsent(state, clientId);
}

export function confirmClientAssignmentAbsent(
  state: ClientAssignmentState,
  clientId: string,
): ClientAssignmentState {
  if (state.clientId && state.clientId !== clientId) {
    return state;
  }

  return {
    status: "ready",
    clientId,
    assignment: null,
    error: null,
    requestId: null,
  };
}

function matchesClientAssignmentRequest(
  state: ClientAssignmentState,
  clientId: string,
  requestId: number,
) {
  return (
    state.status === "loading" &&
    state.clientId === clientId &&
    state.requestId === requestId
  );
}
