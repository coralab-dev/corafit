"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest, getInitialApiConfig } from "@/lib/clients/api";
import type {
  CurrentPlanAssignment,
  SessionExercise,
  SessionExerciseAlternative,
  TrainingPlan,
  TrainingPlanDay,
  TrainingPlanWeek,
  TrainingSession,
} from "@/lib/clients/types";

export function useCurrentAssignmentEditor(clientId: string) {
  const [assignment, setAssignment] = useState<CurrentPlanAssignment | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [apiConfig] = useState(getInitialApiConfig);
  const isApiReady = Boolean(apiConfig.bearerToken.trim() && apiConfig.organizationId.trim());

  const loadAssignment = useCallback(async () => {
    if (!clientId || !isApiReady) {
      setAssignment(null);
      setError("Configura la conexion al API para editar el plan asignado.");
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      const response = await apiRequest<CurrentPlanAssignment | null>(
        `/clients/${clientId}/plan-assignment/current`,
        { method: "GET" },
        apiConfig,
      );
      setAssignment(response);
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setIsLoading(false);
    }
  }, [apiConfig, clientId, isApiReady]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAssignment();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadAssignment]);

  const request = useCallback(
    async <T>(path: string, init: RequestInit) => apiRequest<T>(path, init, apiConfig),
    [apiConfig],
  );

  const basePath = `/clients/${clientId}/plan-assignment/current`;

  return {
    addAlternative: (sessionExerciseId: string, body: { alternativeExerciseId: string; note?: string | null }) =>
      request<SessionExerciseAlternative>(
        `${basePath}/exercises/${sessionExerciseId}/alternative`,
        { method: "POST", body: JSON.stringify(body) },
      ),
    addSessionExercise: (
      sessionId: string,
      body: {
        exerciseId: string;
        orderIndex?: number;
        sets?: number | null;
        reps: string;
        restSeconds?: number | null;
        coachNote?: string | null;
      },
    ) =>
      request<SessionExercise>(
        `${basePath}/sessions/${sessionId}/exercises`,
        { method: "POST", body: JSON.stringify(body) },
      ),
    assignment,
    copyDay: (dayId: string, body: { dayOfWeek: string }) =>
      request<{ id: string }>(
        `${basePath}/days/${dayId}/copy`,
        { method: "POST", body: JSON.stringify(body) },
      ),
    createDay: (weekId: string, body: { dayOfWeek: string; dayType?: string; dayOrder?: number }) =>
      request<{ id: string }>(
        `${basePath}/weeks/${weekId}/days`,
        { method: "POST", body: JSON.stringify(body) },
      ),
    createSession: (dayId: string, body: { name: string; description?: string | null; coachNote?: string | null }) =>
      request<{ id: string }>(
        `${basePath}/days/${dayId}/sessions`,
        { method: "POST", body: JSON.stringify(body) },
      ),
    createWeek: (body: { weekNumber?: number; notes?: string }) =>
      request<TrainingPlanWeek>(
        `${basePath}/weeks`,
        { method: "POST", body: JSON.stringify(body) },
      ),
    deleteAlternative: (alternativeId: string) =>
      request<{ deleted: boolean }>(
        `${basePath}/alternatives/${alternativeId}`,
        { method: "DELETE" },
      ),
    deleteDay: (dayId: string) =>
      request<{ deleted: boolean }>(
        `${basePath}/days/${dayId}`,
        { method: "DELETE" },
      ),
    deleteSession: (sessionId: string) =>
      request<{ deleted: boolean }>(
        `${basePath}/sessions/${sessionId}`,
        { method: "DELETE" },
      ),
    deleteSessionExercise: (sessionExerciseId: string) =>
      request<{ deleted: boolean }>(
        `${basePath}/exercises/${sessionExerciseId}`,
        { method: "DELETE" },
      ),
    deleteWeek: (weekId: string) =>
      request<{ deleted: boolean }>(
        `${basePath}/weeks/${weekId}`,
        { method: "DELETE" },
      ),
    duplicateSessionExercise: (sessionExerciseId: string) =>
      request<SessionExercise>(
        `${basePath}/exercises/${sessionExerciseId}/duplicate`,
        { method: "POST" },
      ),
    duplicateWeek: (weekId: string) =>
      request<TrainingPlanWeek>(
        `${basePath}/weeks/${weekId}/duplicate`,
        { method: "POST" },
      ),
    error,
    isApiReady,
    isLoading,
    loadAssignment,
    plan: assignment?.assignedPlan ?? null,
    reorderSessionExercises: (items: Array<{ sessionExerciseId: string; orderIndex: number }>) =>
      request<{ reordered: boolean }>(
        `${basePath}/exercises/reorder`,
        { method: "POST", body: JSON.stringify({ items }) },
      ),
    updateAlternative: (alternativeId: string, body: { alternativeExerciseId?: string; note?: string | null }) =>
      request<SessionExerciseAlternative>(
        `${basePath}/alternatives/${alternativeId}`,
        { method: "PATCH", body: JSON.stringify(body) },
      ),
    updatePlan: (body: Partial<Pick<TrainingPlan, "name" | "goal" | "level" | "durationWeeks" | "generalNotes">>) =>
      request<CurrentPlanAssignment>(
        basePath,
        { method: "PATCH", body: JSON.stringify(body) },
      ),
    updateSession: (sessionId: string, body: Partial<Pick<TrainingSession, "name" | "description" | "coachNote">>) =>
      request<TrainingSession>(
        `${basePath}/sessions/${sessionId}`,
        { method: "PATCH", body: JSON.stringify(body) },
      ),
    updateSessionExercise: (
      sessionExerciseId: string,
      body: Partial<Pick<SessionExercise, "exerciseId" | "orderIndex" | "sets" | "reps" | "restSeconds" | "coachNote">>,
    ) =>
      request<SessionExercise>(
        `${basePath}/exercises/${sessionExerciseId}`,
        { method: "PATCH", body: JSON.stringify(body) },
      ),
  };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "No se pudo editar el plan asignado";
}

export type CurrentAssignmentEditor = ReturnType<typeof useCurrentAssignmentEditor>;
export type EditableTrainingPlanDay = TrainingPlanDay;
