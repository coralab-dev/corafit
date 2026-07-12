"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { authenticatedRequest, CoraFitApiError } from "@/lib/api/authenticated-request";
import type { Exercise } from "@/hooks/use-exercises";
import type {
  SessionExercise,
  SessionExerciseAlternative,
  TrainingPlan,
  TrainingPlanDay,
  TrainingPlanWeek,
  TrainingSession,
} from "@/hooks/use-training-plans";
import {
  appendAssignedAlternative,
  appendAssignedDay,
  appendAssignedSessionExercise,
  appendAssignedWeek,
  normalizeAssignedPlan,
  removeAssignedAlternative,
  removeAssignedDay,
  removeAssignedSession,
  removeAssignedSessionExercise,
  removeAssignedWeek,
  reorderAssignedSessionExercises,
  replaceAssignedDaySession,
  replaceAssignedSession,
  replaceAssignedSessionExercise,
} from "./current-assignment-editor-state";

type CurrentPlanAssignment = {
  assignment: {
    id: string;
    assignedPlanId: string;
    sourceTrainingPlanId: string;
    startDate: string;
    endedAt: string | null;
    status: "active" | "finished" | "removed";
  };
  sourcePlan: { id: string; name: string } | null;
  assignedPlan: TrainingPlan | null;
};

export function useCurrentAssignmentEditor(clientId: string) {
  const { profile, session, status: authStatus } = useAuth();
  const [assignment, setAssignment] = useState<CurrentPlanAssignment | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const organizationId = profile?.organization?.id ?? null;
  const isApiReady = authStatus === "authenticated" && Boolean(session && organizationId);

  const request = useCallback(
    async <T>(path: string, init: RequestInit = {}) =>
      authenticatedRequest<T>(path, init, { organizationId, session }),
    [organizationId, session],
  );

  const setAssignmentPlan = useCallback(
    (updatePlan: (plan: TrainingPlan) => TrainingPlan) => {
      setAssignment((current) => {
        if (!current?.assignedPlan) {
          return current;
        }

        return {
          ...current,
          assignedPlan: updatePlan(current.assignedPlan),
        };
      });
    },
    [],
  );

  const loadAssignment = useCallback(async () => {
    if (!clientId || !isApiReady) {
      setAssignment(null);
      setError(
        authStatus === "loading"
          ? ""
          : "Inicia sesión y selecciona una organización para editar el plan asignado.",
      );
      return null;
    }

    setIsLoading(true);
    setError("");
    try {
      const response = await request<CurrentPlanAssignment | null>(
        `/clients/${clientId}/plan-assignment/current`,
        { method: "GET" },
      );
      const normalizedResponse = normalizeAssignment(response);
      setAssignment(normalizedResponse);
      return normalizedResponse;
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [authStatus, clientId, isApiReady, request]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAssignment();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadAssignment]);

  const basePath = `/clients/${clientId}/plan-assignment/current`;

  return {
    addAlternative: async (
      sessionExerciseId: string,
      body: { alternativeExerciseId: string; note?: string | null },
      alternativeExerciseSnapshot?: Exercise,
    ) => {
      const createdAlternative = await request<SessionExerciseAlternative>(
        `${basePath}/exercises/${sessionExerciseId}/alternative`,
        { method: "POST", body: JSON.stringify(body) },
      );
      setAssignmentPlan((plan) =>
        appendAssignedAlternative(plan, createdAlternative, alternativeExerciseSnapshot),
      );
      return createdAlternative;
    },
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
      exerciseSnapshot?: Exercise,
    ) => request<SessionExercise>(
        `${basePath}/sessions/${sessionId}/exercises`,
        { method: "POST", body: JSON.stringify(body) },
      ).then((createdExercise) => {
        setAssignmentPlan((plan) =>
          appendAssignedSessionExercise(plan, createdExercise, exerciseSnapshot),
        );
        return createdExercise;
      }),
    assignment,
    copyDay: async (dayId: string, body: { dayOfWeek: string }) => {
      const copiedDay = await request<TrainingPlanDay>(
        `${basePath}/days/${dayId}/copy`,
        { method: "POST", body: JSON.stringify(body) },
      );
      const refreshedAssignment = await loadAssignment();
      return findDay(refreshedAssignment?.assignedPlan ?? null, copiedDay.id) ?? copiedDay;
    },
    createDay: async (weekId: string, body: { dayOfWeek: string; dayType?: string; dayOrder?: number }) => {
      const createdDay = await request<TrainingPlanDay>(
        `${basePath}/weeks/${weekId}/days`,
        { method: "POST", body: JSON.stringify(body) },
      );
      setAssignmentPlan((plan) => appendAssignedDay(plan, createdDay));
      return createdDay;
    },
    createSession: async (dayId: string, body: { name: string; description?: string | null; coachNote?: string | null }) => {
      const createdSession = await request<TrainingSession>(
        `${basePath}/days/${dayId}/sessions`,
        { method: "POST", body: JSON.stringify(body) },
      );
      setAssignmentPlan((plan) => replaceAssignedDaySession(plan, dayId, createdSession));
      return createdSession;
    },
    createWeek: async (body: { weekNumber?: number; notes?: string }) => {
      const createdWeek = await request<TrainingPlanWeek>(
        `${basePath}/weeks`,
        { method: "POST", body: JSON.stringify(body) },
      );
      setAssignmentPlan((plan) => appendAssignedWeek(plan, createdWeek));
      return createdWeek;
    },
    deleteAlternative: async (alternativeId: string) => {
      const result = await request<{ deleted: boolean }>(
        `${basePath}/alternatives/${alternativeId}`,
        { method: "DELETE" },
      );
      setAssignmentPlan((plan) => removeAssignedAlternative(plan, alternativeId));
      return result;
    },
    deleteDay: async (dayId: string) => {
      const result = await request<{ deleted: boolean }>(
        `${basePath}/days/${dayId}`,
        { method: "DELETE" },
      );
      setAssignmentPlan((plan) => removeAssignedDay(plan, dayId));
      return result;
    },
    deleteSession: async (sessionId: string) => {
      const result = await request<{ deleted: boolean }>(
        `${basePath}/sessions/${sessionId}`,
        { method: "DELETE" },
      );
      setAssignmentPlan((plan) => removeAssignedSession(plan, sessionId));
      return result;
    },
    deleteSessionExercise: async (sessionExerciseId: string) => {
      const result = await request<{ deleted: boolean }>(
        `${basePath}/exercises/${sessionExerciseId}`,
        { method: "DELETE" },
      );
      setAssignmentPlan((plan) => removeAssignedSessionExercise(plan, sessionExerciseId));
      return result;
    },
    deleteWeek: async (weekId: string) => {
      const result = await request<{ deleted: boolean }>(
        `${basePath}/weeks/${weekId}`,
        { method: "DELETE" },
      );
      setAssignmentPlan((plan) => removeAssignedWeek(plan, weekId));
      return result;
    },
    duplicateSessionExercise: async (sessionExerciseId: string) => {
      const duplicatedExercise = await request<SessionExercise>(
        `${basePath}/exercises/${sessionExerciseId}/duplicate`,
        { method: "POST" },
      );
      setAssignmentPlan((plan) => appendAssignedSessionExercise(plan, duplicatedExercise));
      return duplicatedExercise;
    },
    duplicateWeek: async (weekId: string) => {
      const duplicatedWeek = await request<TrainingPlanWeek>(
        `${basePath}/weeks/${weekId}/duplicate`,
        { method: "POST" },
      );
      setAssignmentPlan((plan) => appendAssignedWeek(plan, duplicatedWeek));
      return duplicatedWeek;
    },
    error,
    isApiReady,
    isLoading,
    loadAssignment,
    plan: assignment?.assignedPlan ?? null,
    reorderSessionExercises: async (items: Array<{ sessionExerciseId: string; orderIndex: number }>) => {
      const result = await request<{ reordered: boolean }>(
        `${basePath}/exercises/reorder`,
        { method: "POST", body: JSON.stringify({ items }) },
      );
      setAssignmentPlan((plan) => reorderAssignedSessionExercises(plan, items));
      return result;
    },
    updateAlternative: (alternativeId: string, body: { alternativeExerciseId?: string; note?: string | null }) =>
      request<SessionExerciseAlternative>(
        `${basePath}/alternatives/${alternativeId}`,
        { method: "PATCH", body: JSON.stringify(body) },
      ),
    updateDay: async (dayId: string, body: { dayOfWeek: string }) => {
      const copiedDay = await request<TrainingPlanDay>(
        `${basePath}/days/${dayId}/copy`,
        { method: "POST", body: JSON.stringify(body) },
      );
      await request<{ deleted: boolean }>(
        `${basePath}/days/${dayId}`,
        { method: "DELETE" },
      );
      const refreshedAssignment = await loadAssignment();
      return findDay(refreshedAssignment?.assignedPlan ?? null, copiedDay.id) ?? copiedDay;
    },
    updatePlan: async (body: Partial<Pick<TrainingPlan, "name" | "goal" | "level" | "durationWeeks" | "generalNotes">>) => {
      const updatedAssignment = await request<CurrentPlanAssignment>(
        basePath,
        { method: "PATCH", body: JSON.stringify(body) },
      );
      setAssignment({
        ...updatedAssignment,
        assignedPlan: updatedAssignment.assignedPlan
          ? normalizeAssignedPlan(updatedAssignment.assignedPlan)
          : null,
      });
      return updatedAssignment;
    },
    updateSession: async (sessionId: string, body: Partial<Pick<TrainingSession, "name" | "description" | "coachNote">>) => {
      const updatedSession = await request<TrainingSession>(
        `${basePath}/sessions/${sessionId}`,
        { method: "PATCH", body: JSON.stringify(body) },
      );
      setAssignmentPlan((plan) => replaceAssignedSession(plan, updatedSession));
      return updatedSession;
    },
    updateSessionExercise: (
      sessionExerciseId: string,
      body: Partial<Pick<SessionExercise, "exerciseId" | "orderIndex" | "sets" | "reps" | "restSeconds" | "coachNote">>,
    ) => request<SessionExercise>(
        `${basePath}/exercises/${sessionExerciseId}`,
        { method: "PATCH", body: JSON.stringify(body) },
      ).then((updatedExercise) => {
        setAssignmentPlan((plan) =>
          replaceAssignedSessionExercise(plan, updatedExercise, body),
        );
        return updatedExercise;
      }),
  };
}

function normalizeAssignment(
  assignment: CurrentPlanAssignment | null,
): CurrentPlanAssignment | null {
  if (!assignment) {
    return null;
  }

  return {
    ...assignment,
    assignedPlan: assignment.assignedPlan
      ? normalizeAssignedPlan(assignment.assignedPlan)
      : null,
  };
}

function findDay(plan: TrainingPlan | null, dayId: string) {
  return plan?.weeks
    ?.flatMap((week) => week.days)
    .find((day) => day.id === dayId);
}

function getErrorMessage(error: unknown) {
  if (error instanceof CoraFitApiError) {
    return error.payload.message ?? error.code ?? error.message;
  }

  return error instanceof Error ? error.message : "No se pudo editar el plan asignado";
}

export type CurrentAssignmentEditor = ReturnType<typeof useCurrentAssignmentEditor>;
export type EditableTrainingPlanDay = TrainingPlanDay;
