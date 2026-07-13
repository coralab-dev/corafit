import type {
  Client,
  ClientAccess,
  ClientDetailResponse,
  CurrentPlanAssignment,
} from "../../lib/clients/types.ts";

export type ClientDetailLoadResult = {
  requestedClientId: string;
  client: ClientDetailResponse | null;
  access: ClientAccess | null;
  assignment: CurrentPlanAssignment | null;
  error?: string;
  notFound?: boolean;
};

export type ClientDetailState =
  | {
      status: "idle";
      client: null;
      assignment: null;
      error: null;
    }
  | {
      status: "loading";
      client: null;
      assignment: null;
      error: null;
    }
  | {
      status: "ready";
      client: Client;
      assignment: CurrentPlanAssignment | null;
      error: null;
    }
  | {
      status: "not-found";
      client: null;
      assignment: null;
      error: null;
    }
  | {
      status: "error";
      client: null;
      assignment: null;
      error: string;
    };

export const idleClientDetailState: ClientDetailState = {
  status: "idle",
  client: null,
  assignment: null,
  error: null,
};

export const loadingClientDetailState: ClientDetailState = {
  status: "loading",
  client: null,
  assignment: null,
  error: null,
};

export function normalizeClient(
  response: ClientDetailResponse,
  access: ClientAccess | null | undefined,
  assignment: CurrentPlanAssignment | null | undefined,
): Client {
  return {
    ...response,
    age: response.age ?? 0,
    phone: response.phone ?? "",
    sex: response.sex ?? "",
    trainingLevel: response.trainingLevel ?? "",
    injuriesNotes: response.injuriesNotes ?? "",
    generalNotes: response.generalNotes ?? "",
    access: access ?? { status: "none" },
    currentAssignment: assignment ?? null,
  };
}

export function resolveClientDetailState(
  requestedClientId: string,
  result: ClientDetailLoadResult,
): ClientDetailState | null {
  if (result.requestedClientId !== requestedClientId) {
    return null;
  }

  if (result.error && !result.notFound) {
    return {
      status: "error",
      client: null,
      assignment: null,
      error: result.error,
    };
  }

  if (
    result.notFound ||
    !result.client ||
    result.client.id !== requestedClientId
  ) {
    return {
      status: "not-found",
      client: null,
      assignment: null,
      error: null,
    };
  }

  return {
    status: "ready",
    client: normalizeClient(result.client, result.access, result.assignment),
    assignment: result.assignment ?? null,
    error: null,
  };
}

export function reduceClientDetailState(
  currentState: ClientDetailState,
  requestedClientId: string,
  result: ClientDetailLoadResult,
): ClientDetailState {
  return resolveClientDetailState(requestedClientId, result) ?? currentState;
}
