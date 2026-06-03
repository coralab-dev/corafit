"use client";

import { CoraFitApiError, type CoraFitApiErrorPayload } from "@/lib/api/authenticated-request";

const clientPortalApiBaseUrl = "/client-portal-api";

export type ClientPortalStatus =
  | "no_session"
  | "pending"
  | "overdue"
  | "opened"
  | "in_progress"
  | "completed"
  | "partially_completed";

export type ClientPortalDay = {
  date: string;
  dayOfWeek: string;
  dayOrder: number;
  dayType: string;
  status: ClientPortalStatus;
  canOpen: boolean;
  session: null | {
    id: string;
    name: string;
    description: string | null;
    coachNote: string | null;
  };
  log: null | {
    id: string;
    status: ClientPortalStatus;
    openedAt: string;
    completedAt: string | null;
  };
};

export type ClientPortalHome = {
  state: "no_plan" | "not_started" | "active" | "plan_finished";
  timezone: string;
  client: {
    id: string;
    name: string;
  };
  currentPlan: null | {
    assignmentId: string;
    status: string;
    startDate: string;
    endedAt: string | null;
    id: string;
    name: string;
    durationWeeks: number;
  };
  week: null | {
    weekNumber: number;
    weekStartDate: string;
    weekEndDate: string;
    summary: {
      totalTrainingSessions: number;
      completedSessions: number;
      pendingSessions: number;
      openedSessions: number;
      restDays: number;
    };
  };
  todaySession: ClientPortalDay | null;
  nextPendingSession: ClientPortalDay | null;
  latestSession: ClientPortalDay | null;
  calendarLink: {
    href: string;
    query: {
      date: string;
    };
  };
};

export type ClientPortalCalendar = {
  state: "no_plan" | "not_started" | "active" | "plan_finished" | "outside_plan";
  timezone: string;
  client: ClientPortalHome["client"];
  assignment: null | {
    id: string;
    status: string;
    startDate: string;
    endedAt: string | null;
    assignedPlan: {
      id: string;
      name: string;
      durationWeeks: number;
    };
  };
  calendar: null | {
    referenceDate: string;
    today: string;
    weekNumber: number;
    weekStartDate: string;
    weekEndDate: string;
    days: ClientPortalDay[];
  };
};

export type ClientSessionSnapshot = {
  version: 1;
  capturedAt: string;
  session: {
    id: string;
    name: string;
    description: string | null;
    coachNote: string | null;
  };
  exercises: Array<{
    sessionExerciseId: string;
    exerciseId: string;
    orderIndex: number;
    sets: number | null;
    reps: string;
    restSeconds: number | null;
    coachNote: string | null;
    exercise: {
      id: string;
      name: string;
      primaryMuscle: string;
      secondaryMuscles: string[];
      equipment: string;
      instructions: string | null;
      recommendations: string | null;
      mediaUrl: string | null;
      mediaType: string | null;
    };
    alternatives: Array<{
      id: string;
      alternativeExerciseId: string;
      note: string | null;
      exercise: {
        id: string;
        name: string;
        primaryMuscle: string;
        secondaryMuscles: string[];
        equipment: string;
        instructions: string | null;
        recommendations: string | null;
        mediaUrl: string | null;
        mediaType: string | null;
      };
    }>;
  }>;
  progress?: {
    completedExerciseIds: string[];
    usedAlternatives: Array<{
      sessionExerciseId: string;
      alternativeId: string;
      alternativeExerciseId: string;
    }>;
  };
};

export type ClientSessionLog = {
  id: string;
  clientId: string;
  assignmentId: string;
  trainingSessionId: string;
  scheduledDate: string;
  status: ClientPortalStatus;
  openedAt?: string;
  completedAt: string | null;
  snapshotData: ClientSessionSnapshot;
};

export type ClientSessionPreview = {
  trainingSessionId: string;
  scheduledDate: string;
  status: "preview";
  canOpen: false;
  snapshotData: ClientSessionSnapshot;
};

export type CompletionCard = {
  sessionName: string;
  scheduledDate: string;
  status: ClientPortalStatus;
  completedExercises: number;
  totalExercises: number;
  completionPercentage: number;
  streak: number;
};

export type ClientPortalTokenStatus = {
  valid: boolean;
  requiresPin: boolean;
  clientName?: string;
  locked?: boolean;
  lockedUntil?: string | null;
  remainingAttempts?: number;
};

export type ClientPortalSessionStatus = {
  authenticated: boolean;
  clientId?: string;
  expiresAt?: string;
};

export async function clientPortalRequest<T>(path: string, init: RequestInit = {}) {
  const response = await fetch(`${clientPortalApiBaseUrl}${path}`, {
    ...init,
    cache: "no-store",
    credentials: "include",
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });

  if (!response.ok) {
    throw await toApiError(response);
  }

  const text = await response.text();
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

export function getClientPortalTokenStatus(token: string) {
  return clientPortalRequest<ClientPortalTokenStatus>(`/client-portal/${encodeURIComponent(token)}`);
}

export function getClientPortalSession(token: string) {
  return clientPortalRequest<ClientPortalSessionStatus>(`/client-portal/${encodeURIComponent(token)}/session`);
}

export function verifyPin(token: string, pin: string) {
  return clientPortalRequest<{
    success: boolean;
    remainingAttempts: number;
    locked: boolean;
    lockedUntil?: string | null;
  }>(`/client-portal/${encodeURIComponent(token)}/verify-pin`, {
    method: "POST",
    body: JSON.stringify({ pin }),
  });
}

async function toApiError(response: Response) {
  try {
    const payload = (await response.json()) as CoraFitApiErrorPayload;
    return new CoraFitApiError(response.status, payload);
  } catch {
    return new CoraFitApiError(response.status, { message: `API ${response.status}` });
  }
}
