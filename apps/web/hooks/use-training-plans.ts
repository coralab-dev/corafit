"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import type { Exercise } from "@/hooks/use-exercises";

export type TrainingPlanStatus = "draft" | "active" | "archived";
export type TrainingPlanType = "template" | "assigned_copy";
export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type SessionExerciseAlternative = {
  id: string;
  sessionExerciseId: string;
  alternativeExerciseId: string;
  note: string | null;
  alternativeExercise?: Exercise;
};

export type SessionExercise = {
  id: string;
  trainingSessionId: string;
  exerciseId: string;
  orderIndex: number;
  sets: number | null;
  reps: string;
  restSeconds: number | null;
  coachNote: string | null;
  exercise?: Exercise;
  alternatives: SessionExerciseAlternative[];
};

export type TrainingSession = {
  id: string;
  trainingPlanDayId: string;
  name: string;
  description: string | null;
  coachNote: string | null;
  exercises: SessionExercise[];
};

export type TrainingPlanDay = {
  id: string;
  trainingPlanWeekId: string;
  dayOfWeek: DayOfWeek;
  dayOrder: number | null;
  dayType: "training" | "rest";
  session: TrainingSession | null;
};

export type TrainingPlanWeek = {
  id: string;
  trainingPlanId: string;
  weekNumber: number;
  notes: string | null;
  days: TrainingPlanDay[];
};

export type TrainingPlan = {
  id: string;
  organizationId: string;
  createdByMemberId: string;
  planType: TrainingPlanType;
  sourcePlanId: string | null;
  assignedClientId: string | null;
  name: string;
  goal: string | null;
  level: string | null;
  durationWeeks: number;
  generalNotes: string | null;
  status: TrainingPlanStatus;
  isSystemTemplate?: boolean;
  createdAt: string;
  updatedAt: string;
  weeks?: TrainingPlanWeek[];
};

type PlansResponse = {
  items: TrainingPlan[];
  page: number;
  limit: number;
  total: number;
};

type ApiConfig = {
  apiUrl: string;
  bearerToken: string;
  organizationId: string;
};

export type PlanListFilters = {
  search?: string;
  status?: TrainingPlanStatus | "all";
};

const apiConfigStorageKey = "corafit_api_config";
const fallbackApiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export function useTrainingPlans(filters: PlanListFilters) {
  const [items, setItems] = useState<TrainingPlan[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [apiConfig] = useState(getApiConfig);
  const isApiReady = Boolean(apiConfig.bearerToken.trim() && apiConfig.organizationId.trim());

  const loadPlans = useCallback(async () => {
    if (!isApiReady) {
      setItems([]);
      setTotal(0);
      setError("Configura la conexion al API para leer planes reales.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const searchParams = new URLSearchParams({ page: "1", limit: "50" });
      if (filters.search?.trim()) {
        searchParams.set("search", filters.search.trim());
      }
      if (filters.status && filters.status !== "all") {
        searchParams.set("status", filters.status);
      }

      const response = await apiRequest<PlansResponse>(
        `/training-plans?${searchParams.toString()}`,
        { method: "GET" },
        apiConfig,
      );
      setItems(response.items);
      setTotal(response.total);
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setIsLoading(false);
    }
  }, [apiConfig, filters.search, filters.status, isApiReady]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadPlans();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadPlans]);

  return { error, isApiReady, isLoading, items, refresh: loadPlans, total };
}

export function useTrainingPlanEditor(planId: string) {
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [apiConfig] = useState(getApiConfig);
  const isApiReady = Boolean(apiConfig.bearerToken.trim() && apiConfig.organizationId.trim());

  const loadPlan = useCallback(async () => {
    if (!planId || !isApiReady) {
      setPlan(null);
      setError("Configura la conexion al API para editar planes reales.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await apiRequest<TrainingPlan>(
        `/training-plans/${planId}`,
        { method: "GET" },
        apiConfig,
      );
      setPlan(response);
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setIsLoading(false);
    }
  }, [apiConfig, isApiReady, planId]);

  useEffect(() => {
    void loadPlan();
  }, [loadPlan]);

  const request = useCallback(
    async <T>(path: string, init: RequestInit) => {
      const response = await apiRequest<T>(path, init, apiConfig);
      return response;
    },
    [apiConfig],
  );

  return {
    addAlternative: (sessionExerciseId: string, body: { alternativeExerciseId: string; note?: string | null }) =>
      request<SessionExerciseAlternative>(
        `/session-exercises/${sessionExerciseId}/alternative`,
        { method: "POST", body: JSON.stringify(body) },
      ),
    addSessionExercise: (sessionId: string, body: {
      exerciseId: string;
      orderIndex?: number;
      sets?: number | null;
      reps: string;
      restSeconds?: number | null;
      coachNote?: string | null;
    }) =>
      request<SessionExercise>(
        `/training-sessions/${sessionId}/exercises`,
        { method: "POST", body: JSON.stringify(body) },
      ),
    deleteAlternative: (alternativeId: string) =>
      request<{ deleted: boolean }>(
        `/session-exercise-alternatives/${alternativeId}`,
        { method: "DELETE" },
      ),
    deleteSessionExercise: (sessionExerciseId: string) =>
      request<{ deleted: boolean }>(
        `/session-exercises/${sessionExerciseId}`,
        { method: "DELETE" },
      ),
    duplicateSessionExercise: (sessionExerciseId: string) =>
      request<SessionExercise>(
        `/session-exercises/${sessionExerciseId}/duplicate`,
        { method: "POST" },
      ),
    error,
    isApiReady,
    isLoading,
    loadPlan,
    plan,
    reorderSessionExercises: (items: Array<{ sessionExerciseId: string; orderIndex: number }>) =>
      request<{ reordered: boolean }>(
        "/session-exercises/reorder",
        { method: "POST", body: JSON.stringify({ items }) },
      ),
    updateAlternative: (alternativeId: string, body: { alternativeExerciseId?: string; note?: string | null }) =>
      request<SessionExerciseAlternative>(
        `/session-exercise-alternatives/${alternativeId}`,
        { method: "PATCH", body: JSON.stringify(body) },
      ),
    updatePlan: (body: Partial<Pick<TrainingPlan, "name" | "goal" | "level" | "durationWeeks" | "generalNotes">>) =>
      request<TrainingPlan>(
        `/training-plans/${planId}`,
        { method: "PATCH", body: JSON.stringify(body) },
      ),
    updateSession: (sessionId: string, body: Partial<Pick<TrainingSession, "name" | "description" | "coachNote">>) =>
      request<TrainingSession>(
        `/training-sessions/${sessionId}`,
        { method: "PATCH", body: JSON.stringify(body) },
      ),
    updateSessionExercise: (sessionExerciseId: string, body: Partial<Pick<SessionExercise, "exerciseId" | "orderIndex" | "sets" | "reps" | "restSeconds" | "coachNote">>) =>
      request<SessionExercise>(
        `/session-exercises/${sessionExerciseId}`,
        { method: "PATCH", body: JSON.stringify(body) },
      ),
  };
}

function getApiConfig(): ApiConfig {
  const fallback = {
    apiUrl: fallbackApiUrl,
    bearerToken: "",
    organizationId: "",
  };

  if (typeof window === "undefined") {
    return fallback;
  }

  const storedConfig = window.localStorage.getItem(apiConfigStorageKey);
  if (!storedConfig) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(storedConfig) as Partial<ApiConfig>;
    return {
      apiUrl: (parsed.apiUrl ?? fallback.apiUrl).replace(/\/$/, ""),
      bearerToken: parsed.bearerToken ?? "",
      organizationId: parsed.organizationId ?? "",
    };
  } catch {
    return fallback;
  }
}

async function apiRequest<T>(
  path: string,
  init: RequestInit,
  config: ApiConfig,
): Promise<T> {
  const response = await fetch(`${config.apiUrl}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(init.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(config.bearerToken ? { Authorization: `Bearer ${config.bearerToken}` } : {}),
      ...(config.organizationId ? { "X-Organization-Id": config.organizationId } : {}),
      ...init.headers,
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `API request failed with ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Ocurrio un error inesperado";
}
