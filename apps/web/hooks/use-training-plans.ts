"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import type { Exercise } from "@/hooks/use-exercises";
import { authenticatedRequest, CoraFitApiError } from "@/lib/api/authenticated-request";
import { dayOfWeekValues } from "@/components/training-plans/training-plan-days";
import { mergeSessionExerciseUpdate } from "@/components/training-plans/training-plan-editor-utils";
import { fetchAllPages } from "@/lib/pagination";

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

export type TrainingPlanMetrics = {
  total: number | null;
  active: number | null;
  draft: number | null;
  archived: number | null;
};

const emptyTrainingPlanMetrics: TrainingPlanMetrics = {
  total: null,
  active: null,
  draft: null,
  archived: null,
};

export type PlanListFilters = {
  search?: string;
  status?: TrainingPlanStatus | "all";
};

export function useTrainingPlans(filters: PlanListFilters) {
  const { profile, session, status: authStatus } = useAuth();
  const [items, setItems] = useState<TrainingPlan[]>([]);
  const [total, setTotal] = useState(0);
  const [isRequestLoading, setIsRequestLoading] = useState(false);
  const [error, setError] = useState("");

  const organizationId = profile?.organization?.id ?? null;
  const isApiReady = authStatus === "authenticated" && Boolean(session && organizationId);
  const isLoading = authStatus === "loading" || isRequestLoading;

  const request = useCallback(
    <T,>(path: string, init: RequestInit = {}) =>
      authenticatedRequest<T>(path, init, { organizationId, session }),
    [organizationId, session],
  );

  const loadPlans = useCallback(async () => {
    if (!isApiReady) {
      setItems([]);
      setTotal(0);
      setError(
        authStatus === "loading"
          ? ""
          : "Inicia sesión y selecciona una organización para ver tus planes.",
      );
      return;
    }

    setIsRequestLoading(true);
    setError("");

    try {
      const searchParams = new URLSearchParams();
      if (filters.search?.trim()) {
        searchParams.set("search", filters.search.trim());
      }
      if (filters.status && filters.status !== "all") {
        searchParams.set("status", filters.status);
      }

      const allPlans = await fetchAllPages({
        params: searchParams,
        fetchPage: (pageParams) =>
          request<PlansResponse>(
            `/training-plans?${pageParams.toString()}`,
            { method: "GET" },
          ),
      });
      setItems(allPlans);
      setTotal(allPlans.length);
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setIsRequestLoading(false);
    }
  }, [authStatus, filters.search, filters.status, isApiReady, request]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadPlans();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadPlans]);

  async function createPlan(body: {
    name: string;
    durationWeeks: number;
    goal?: string;
    level?: string;
    generalNotes?: string;
  }) {
    if (!isApiReady) {
      throw new Error("Inicia sesión y selecciona una organización para ver tus planes.");
    }

    const response = await request<TrainingPlan>(
      "/training-plans",
      { method: "POST", body: JSON.stringify(body) },
    );

    return response;
  }

  return { createPlan, error, isApiReady, isLoading, items, refresh: loadPlans, total };
}

export function useTrainingPlanMetrics() {
  const { profile, session, status: authStatus } = useAuth();
  const [metrics, setMetrics] = useState<TrainingPlanMetrics>(emptyTrainingPlanMetrics);
  const [isRequestLoading, setIsRequestLoading] = useState(false);
  const [error, setError] = useState("");

  const organizationId = profile?.organization?.id ?? null;
  const isApiReady = authStatus === "authenticated" && Boolean(session && organizationId);
  const isLoading = authStatus === "loading" || isRequestLoading;

  const request = useCallback(
    <T,>(path: string, init: RequestInit = {}) =>
      authenticatedRequest<T>(path, init, { organizationId, session }),
    [organizationId, session],
  );

  const loadMetrics = useCallback(async () => {
    if (!isApiReady) {
      setMetrics(emptyTrainingPlanMetrics);
      setError(
        authStatus === "loading"
          ? ""
          : "Inicia sesión y selecciona una organización para ver las métricas de tus planes.",
      );
      return;
    }

    setIsRequestLoading(true);
    setError("");

    try {
      const responses = await Promise.all(
        (["all", "active", "draft", "archived"] as const).map(async (status) => {
          const searchParams = new URLSearchParams({ page: "1", limit: "1" });
          if (status !== "all") {
            searchParams.set("status", status);
          }

          return request<PlansResponse>(
            `/training-plans?${searchParams.toString()}`,
            { method: "GET" },
          );
        }),
      );

      setMetrics({
        total: responses[0].total,
        active: responses[1].total,
        draft: responses[2].total,
        archived: responses[3].total,
      });
    } catch (caughtError) {
      setMetrics(emptyTrainingPlanMetrics);
      setError(getErrorMessage(caughtError));
    } finally {
      setIsRequestLoading(false);
    }
  }, [authStatus, isApiReady, request]);

  useEffect(() => {
    void loadMetrics();
  }, [loadMetrics]);

  return { error, isLoading, metrics, refresh: loadMetrics };
}

export function useTrainingPlanEditor(planId: string) {
  const { profile, session, status: authStatus } = useAuth();
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [isRequestLoading, setIsRequestLoading] = useState(false);
  const [error, setError] = useState("");

  const organizationId = profile?.organization?.id ?? null;
  const isApiReady = authStatus === "authenticated" && Boolean(session && organizationId);
  const isLoading = authStatus === "loading" || isRequestLoading;

  const request = useCallback(
    <T,>(path: string, init: RequestInit = {}) =>
      authenticatedRequest<T>(path, init, { organizationId, session }),
    [organizationId, session],
  );

  const loadPlan = useCallback(async () => {
    if (!planId || !isApiReady) {
      setPlan(null);
      setError(
        authStatus === "loading"
          ? ""
          : "Inicia sesión y selecciona una organización para editar este plan.",
      );
      return;
    }

    setIsRequestLoading(true);
    setError("");

    try {
      const response = await request<TrainingPlan>(
        `/training-plans/${planId}`,
        { method: "GET" },
      );
      setPlan(response);
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setIsRequestLoading(false);
    }
  }, [authStatus, isApiReady, planId, request]);

  useEffect(() => {
    void loadPlan();
  }, [loadPlan]);

  const replaceSession = useCallback((updatedSession: TrainingSession) => {
    setPlan((currentPlan) => {
      if (!currentPlan) {
        return currentPlan;
      }

      return {
        ...currentPlan,
        weeks: currentPlan.weeks?.map((week) => ({
          ...week,
          days: week.days.map((day) =>
            day.session?.id === updatedSession.id
              ? { ...day, session: updatedSession }
              : day,
          ),
        })),
      };
    });
  }, []);

  const replaceSessionExercise = useCallback((
    updatedExercise: SessionExercise,
    requestedFields?: Partial<SessionExercise>,
  ) => {
    const normalizedExercise = normalizeSessionExercise(updatedExercise);

    setPlan((currentPlan) => {
      if (!currentPlan) {
        return currentPlan;
      }

      return {
        ...currentPlan,
        weeks: currentPlan.weeks?.map((week) => ({
          ...week,
          days: week.days.map((day) => {
            if (!day.session || day.session.id !== updatedExercise.trainingSessionId) {
              return day;
            }

            return {
              ...day,
              session: {
                ...day.session,
                exercises: day.session.exercises.map((exercise) =>
                  exercise.id === normalizedExercise.id
                    ? requestedFields
                      ? mergeSessionExerciseUpdate(exercise, normalizedExercise, requestedFields)
                      : normalizedExercise
                    : exercise,
                ),
              },
            };
          }),
        })),
      };
    });
  }, []);

  const appendSessionExercise = useCallback((
    createdExercise: SessionExercise,
    exerciseSnapshot?: Exercise,
  ) => {
    const normalizedExercise = normalizeSessionExercise(
      createdExercise,
      exerciseSnapshot,
    );

    setPlan((currentPlan) => {
      if (!currentPlan) {
        return currentPlan;
      }

      return updatePlanSessions(currentPlan, (session) =>
        session.id === normalizedExercise.trainingSessionId
          ? {
              ...session,
              exercises: [...session.exercises, normalizedExercise].sort(
                (first, second) => first.orderIndex - second.orderIndex,
              ),
            }
          : session,
      );
    });
  }, []);

  const removeSessionExercise = useCallback((sessionExerciseId: string) => {
    setPlan((currentPlan) => {
      if (!currentPlan) {
        return currentPlan;
      }

      return updatePlanSessions(currentPlan, (session) => ({
        ...session,
        exercises: session.exercises.filter(
          (exercise) => exercise.id !== sessionExerciseId,
        ),
      }));
    });
  }, []);

  const reorderLocalSessionExercises = useCallback(
    (items: Array<{ sessionExerciseId: string; orderIndex: number }>) => {
      const orderById = new Map(
        items.map((item) => [item.sessionExerciseId, item.orderIndex]),
      );

      setPlan((currentPlan) => {
        if (!currentPlan) {
          return currentPlan;
        }

        return updatePlanSessions(currentPlan, (session) => ({
          ...session,
          exercises: session.exercises
            .map((exercise) =>
              orderById.has(exercise.id)
                ? { ...exercise, orderIndex: orderById.get(exercise.id) ?? exercise.orderIndex }
                : exercise,
            )
            .sort((first, second) => first.orderIndex - second.orderIndex),
        }));
      });
    },
    [],
  );

  const appendAlternative = useCallback((
    createdAlternative: SessionExerciseAlternative,
    alternativeExerciseSnapshot?: Exercise,
  ) => {
    const normalizedAlternative = {
      ...createdAlternative,
      alternativeExercise:
        createdAlternative.alternativeExercise ?? alternativeExerciseSnapshot,
    };

    setPlan((currentPlan) => {
      if (!currentPlan) {
        return currentPlan;
      }

      return updatePlanExercises(currentPlan, (exercise) =>
        exercise.id === createdAlternative.sessionExerciseId
          ? {
              ...exercise,
              alternatives: [
                ...(exercise.alternatives ?? []),
                normalizedAlternative,
              ],
            }
          : exercise,
      );
    });
  }, []);

  const removeAlternative = useCallback((alternativeId: string) => {
    setPlan((currentPlan) => {
      if (!currentPlan) {
        return currentPlan;
      }

      return updatePlanExercises(currentPlan, (exercise) => ({
        ...exercise,
        alternatives: (exercise.alternatives ?? []).filter(
          (alternative) => alternative.id !== alternativeId,
        ),
      }));
    });
  }, []);

  const appendWeek = useCallback((createdWeek: Omit<TrainingPlanWeek, "days"> & { days?: TrainingPlanDay[] }) => {
    setPlan((currentPlan) => {
      if (!currentPlan) {
        return currentPlan;
      }

      const week = { ...createdWeek, days: createdWeek.days ?? [] };
      return {
        ...currentPlan,
        durationWeeks: Math.max(currentPlan.durationWeeks, week.weekNumber),
        weeks: [...(currentPlan.weeks ?? []), week].sort(
          (first, second) => first.weekNumber - second.weekNumber,
        ),
      };
    });
  }, []);

  const removeWeek = useCallback((weekId: string) => {
    setPlan((currentPlan) => {
      if (!currentPlan) {
        return currentPlan;
      }

      const weeks = (currentPlan.weeks ?? []).filter((week) => week.id !== weekId);
      return {
        ...currentPlan,
        durationWeeks: Math.max(
          weeks.reduce((max, week) => Math.max(max, week.weekNumber), 1),
          1,
        ),
        weeks,
      };
    });
  }, []);

  const appendDay = useCallback((createdDay: TrainingPlanDay) => {
    setPlan((currentPlan) => {
      if (!currentPlan) {
        return currentPlan;
      }

      return {
        ...currentPlan,
        weeks: currentPlan.weeks?.map((week) =>
          week.id === createdDay.trainingPlanWeekId
            ? {
                ...week,
                days: [
                  ...week.days,
                  { ...createdDay, session: createdDay.session ?? null },
                ].sort((first, second) =>
                  dayOfWeekValues.indexOf(first.dayOfWeek) -
                  dayOfWeekValues.indexOf(second.dayOfWeek),
                ),
              }
            : week,
        ),
      };
    });
  }, []);

  const replaceDay = useCallback((updatedDay: TrainingPlanDay) => {
    setPlan((currentPlan) => {
      if (!currentPlan) {
        return currentPlan;
      }

      return {
        ...currentPlan,
        weeks: currentPlan.weeks?.map((week) => ({
          ...week,
          days: week.days
            .map((day) =>
              day.id === updatedDay.id
                ? { ...day, ...updatedDay, session: updatedDay.session ?? day.session ?? null }
                : day,
            )
            .sort((first, second) =>
              dayOfWeekValues.indexOf(first.dayOfWeek) -
              dayOfWeekValues.indexOf(second.dayOfWeek),
            ),
        })),
      };
    });
  }, []);

  const removeDay = useCallback((dayId: string) => {
    setPlan((currentPlan) => {
      if (!currentPlan) {
        return currentPlan;
      }

      return {
        ...currentPlan,
        weeks: currentPlan.weeks?.map((week) => ({
          ...week,
          days: week.days.filter((day) => day.id !== dayId),
        })),
      };
    });
  }, []);

  const replaceDaySession = useCallback((dayId: string, session: TrainingSession | null) => {
    setPlan((currentPlan) => {
      if (!currentPlan) {
        return currentPlan;
      }

      return {
        ...currentPlan,
        weeks: currentPlan.weeks?.map((week) => ({
          ...week,
          days: week.days.map((day) =>
            day.id === dayId ? { ...day, session } : day,
          ),
        })),
      };
    });
  }, []);

  const removeSession = useCallback((sessionId: string) => {
    setPlan((currentPlan) => {
      if (!currentPlan) {
        return currentPlan;
      }

      return {
        ...currentPlan,
        weeks: currentPlan.weeks?.map((week) => ({
          ...week,
          days: week.days.map((day) =>
            day.session?.id === sessionId ? { ...day, session: null } : day,
          ),
        })),
      };
    });
  }, []);

  return {
    addAlternative: async (
      sessionExerciseId: string,
      body: { alternativeExerciseId: string; note?: string | null },
      alternativeExerciseSnapshot?: Exercise,
    ) => {
      const createdAlternative = await request<SessionExerciseAlternative>(
        `/session-exercises/${sessionExerciseId}/alternative`,
        { method: "POST", body: JSON.stringify(body) },
      );
      appendAlternative(createdAlternative, alternativeExerciseSnapshot);
      return createdAlternative;
    },
    addSessionExercise: async (sessionId: string, body: {
      exerciseId: string;
      orderIndex?: number;
      sets?: number | null;
      reps: string;
      restSeconds?: number | null;
      coachNote?: string | null;
    }, exerciseSnapshot?: Exercise) => {
      const createdExercise = await request<SessionExercise>(
        `/training-sessions/${sessionId}/exercises`,
        { method: "POST", body: JSON.stringify(body) },
      );
      appendSessionExercise(createdExercise, exerciseSnapshot);
      return createdExercise;
    },
    deleteAlternative: async (alternativeId: string) => {
      const result = await request<{ deleted: boolean }>(
        `/session-exercise-alternatives/${alternativeId}`,
        { method: "DELETE" },
      );
      removeAlternative(alternativeId);
      return result;
    },
    deleteSessionExercise: async (sessionExerciseId: string) => {
      const result = await request<{ deleted: boolean }>(
        `/session-exercises/${sessionExerciseId}`,
        { method: "DELETE" },
      );
      removeSessionExercise(sessionExerciseId);
      return result;
    },
    duplicateSessionExercise: async (sessionExerciseId: string) => {
      const duplicatedExercise = await request<SessionExercise>(
        `/session-exercises/${sessionExerciseId}/duplicate`,
        { method: "POST" },
      );
      appendSessionExercise(duplicatedExercise);
      return duplicatedExercise;
    },
    duplicatePlan: (body: { name?: string } = {}) =>
      request<{ id: string }>(
        `/training-plans/${planId}/duplicate`,
        { method: "POST", body: JSON.stringify(body) },
      ),
    error,
    isApiReady,
    isLoading,
    loadPlan,
    plan,
    reorderSessionExercises: async (items: Array<{ sessionExerciseId: string; orderIndex: number }>) => {
      const result = await request<{ reordered: boolean }>(
        "/session-exercises/reorder",
        { method: "POST", body: JSON.stringify({ items }) },
      );
      reorderLocalSessionExercises(items);
      return result;
    },
    updateAlternative: (alternativeId: string, body: { alternativeExerciseId?: string; note?: string | null }) =>
      request<SessionExerciseAlternative>(
        `/session-exercise-alternatives/${alternativeId}`,
        { method: "PATCH", body: JSON.stringify(body) },
      ),
    updatePlan: async (body: Partial<Pick<TrainingPlan, "name" | "goal" | "level" | "durationWeeks" | "generalNotes">>) => {
      const updatedPlan = await request<TrainingPlan>(
        `/training-plans/${planId}`,
        { method: "PATCH", body: JSON.stringify(body) },
      );
      setPlan((currentPlan) =>
        currentPlan && !updatedPlan.weeks
          ? { ...currentPlan, ...updatedPlan, weeks: currentPlan.weeks }
          : updatedPlan,
      );
      return updatedPlan;
    },
    updateSession: async (sessionId: string, body: Partial<Pick<TrainingSession, "name" | "description" | "coachNote">>) => {
      const updatedSession = await request<TrainingSession>(
        `/training-sessions/${sessionId}`,
        { method: "PATCH", body: JSON.stringify(body) },
      );
      replaceSession(updatedSession);
      return updatedSession;
    },
    updateSessionExercise: async (sessionExerciseId: string, body: Partial<Pick<SessionExercise, "exerciseId" | "orderIndex" | "sets" | "reps" | "restSeconds" | "coachNote">>) => {
      const updatedExercise = await request<SessionExercise>(
        `/session-exercises/${sessionExerciseId}`,
        { method: "PATCH", body: JSON.stringify(body) },
      );
      replaceSessionExercise(updatedExercise, body);
      return updatedExercise;
    },
    createWeek: async (body: { weekNumber?: number; notes?: string }) => {
      const createdWeek = await request<TrainingPlanWeek>(
        `/training-plans/${planId}/weeks`,
        { method: "POST", body: JSON.stringify(body) },
      );
      appendWeek(createdWeek);
      return createdWeek;
    },
    deleteWeek: async (weekId: string) => {
      const result = await request<{ deleted: boolean }>(
        `/training-plans/${planId}/weeks/${weekId}`,
        { method: "DELETE" },
      );
      removeWeek(weekId);
      return result;
    },
    duplicateWeek: async (weekId: string) => {
      const duplicatedWeek = await request<TrainingPlanWeek>(
        `/training-plans/${planId}/weeks/${weekId}/duplicate`,
        { method: "POST" },
      );
      appendWeek(duplicatedWeek);
      return duplicatedWeek;
    },
    createDay: async (weekId: string, body: { dayOfWeek: string; dayType?: string; dayOrder?: number }) => {
      const createdDay = await request<TrainingPlanDay>(
        `/training-plans/${planId}/weeks/${weekId}/days`,
        { method: "POST", body: JSON.stringify(body) },
      );
      appendDay(createdDay);
      return createdDay;
    },
    deleteDay: async (dayId: string) => {
      const result = await request<{ deleted: boolean }>(
        `/training-plan-days/${dayId}`,
        { method: "DELETE" },
      );
      removeDay(dayId);
      return result;
    },
    updateDay: async (dayId: string, body: { dayOfWeek: string }) => {
      const updatedDay = await request<TrainingPlanDay>(
        `/training-plan-days/${dayId}`,
        { method: "PATCH", body: JSON.stringify(body) },
      );
      replaceDay(updatedDay);
      return updatedDay;
    },
    copyDay: async (dayId: string, body: { dayOfWeek: string }) => {
      const copiedDay = await request<TrainingPlanDay>(
        `/training-plan-days/${dayId}/copy`,
        { method: "POST", body: JSON.stringify(body) },
      );
      await loadPlan();
      return copiedDay;
    },
    createSession: async (dayId: string, body: { name: string; description?: string | null; coachNote?: string | null }) => {
      const createdSession = await request<TrainingSession>(
        `/training-plan-days/${dayId}/sessions`,
        { method: "POST", body: JSON.stringify(body) },
      );
      replaceDaySession(dayId, { ...createdSession, exercises: createdSession.exercises ?? [] });
      return createdSession;
    },
    deleteSession: async (sessionId: string) => {
      const result = await request<{ deleted: boolean }>(
        `/training-sessions/${sessionId}`,
        { method: "DELETE" },
      );
      removeSession(sessionId);
      return result;
    },
    updatePlanStatus: (status: string) =>
      request<TrainingPlan>(
        `/training-plans/${planId}/status`,
        { method: "PATCH", body: JSON.stringify({ status }) },
      ),
  };
}

function updatePlanSessions(
  plan: TrainingPlan,
  updateSession: (session: TrainingSession) => TrainingSession,
) {
  return {
    ...plan,
    weeks: plan.weeks?.map((week) => ({
      ...week,
      days: week.days.map((day) =>
        day.session ? { ...day, session: updateSession(day.session) } : day,
      ),
    })),
  };
}

function updatePlanExercises(
  plan: TrainingPlan,
  updateExercise: (exercise: SessionExercise) => SessionExercise,
) {
  return updatePlanSessions(plan, (session) => ({
    ...session,
    exercises: session.exercises.map((exercise) =>
      updateExercise(normalizeSessionExercise(exercise)),
    ),
  }));
}

function normalizeSessionExercise(
  exercise: SessionExercise,
  exerciseSnapshot?: Exercise,
): SessionExercise {
  return {
    ...exercise,
    exercise: exercise.exercise ?? exerciseSnapshot,
    alternatives: exercise.alternatives ?? [],
  };
}

function getErrorMessage(error: unknown) {
  if (error instanceof CoraFitApiError) {
    return error.payload.message ?? error.code ?? error.message;
  }

  return error instanceof Error ? error.message : "Ocurrió un error inesperado";
}
