"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { authenticatedRequest } from "@/lib/api/authenticated-request";
import type {
  Equipment,
  Exercise,
  ExerciseMediaType,
  PrimaryMuscle,
} from "@/hooks/use-exercises";

export type ExerciseStatus = "active" | "inactive" | "archived";

export type AdminExerciseFilters = {
  equipment?: Equipment | "all";
  primaryMuscle?: PrimaryMuscle | "all";
  search?: string;
  status?: ExerciseStatus;
};

export type AdminExerciseInput = {
  equipment: Equipment;
  instructions?: string | null;
  mediaType?: ExerciseMediaType | null;
  mediaUrl?: string | null;
  videoUrl?: string | null;
  name: string;
  primaryMuscle: PrimaryMuscle;
  recommendations?: string | null;
  secondaryMuscles?: string[];
  status?: ExerciseStatus;
};

type ExercisesResponse = {
  items: Exercise[];
  limit: number;
  page: number;
  total: number;
};

export function useAdminExercises(filters: AdminExerciseFilters) {
  const { profile, session, status: authStatus } = useAuth();
  const [items, setItems] = useState<Exercise[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const isApiReady =
    authStatus === "authenticated" &&
    Boolean(session) &&
    profile?.user.platformRole === "admin_saas";
  const normalizedFilters = useMemo(
    () => ({
      equipment: filters.equipment ?? "all",
      primaryMuscle: filters.primaryMuscle ?? "all",
      search: filters.search?.trim() ?? "",
      status: filters.status ?? "active",
    }),
    [filters.equipment, filters.primaryMuscle, filters.search, filters.status],
  );

  const adminRequest = useCallback(
    <T,>(path: string, init: RequestInit = {}) =>
      authenticatedRequest<T>(path, init, { session }),
    [session],
  );

  const loadExercises = useCallback(async () => {
    if (!isApiReady) {
      setItems([]);
      setTotal(0);
      setError(authStatus === "loading" ? "" : "Inicia sesion como admin.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const searchParams = new URLSearchParams({
        limit: "100",
        page: "1",
        status: normalizedFilters.status,
      });

      if (normalizedFilters.search) {
        searchParams.set("search", normalizedFilters.search);
      }
      if (normalizedFilters.primaryMuscle !== "all") {
        searchParams.set("primaryMuscle", normalizedFilters.primaryMuscle);
      }
      if (normalizedFilters.equipment !== "all") {
        searchParams.set("equipment", normalizedFilters.equipment);
      }

      const response = await adminRequest<ExercisesResponse>(
        `/admin/exercises?${searchParams.toString()}`,
        { method: "GET" },
      );

      setItems(response.items);
      setTotal(response.total);
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setIsLoading(false);
    }
  }, [adminRequest, authStatus, isApiReady, normalizedFilters]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadExercises();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadExercises]);

  const createExercise = useCallback(
    async (input: AdminExerciseInput) => {
      const exercise = await adminRequest<Exercise>("/admin/exercises", {
        method: "POST",
        body: JSON.stringify(input),
      });
      setItems((current) => [exercise, ...current]);
      setTotal((current) => current + 1);
      return exercise;
    },
    [adminRequest],
  );

  const updateExercise = useCallback(
    async (exerciseId: string, input: Partial<AdminExerciseInput>) => {
      const exercise = await adminRequest<Exercise>(`/admin/exercises/${exerciseId}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      });
      setItems((current) =>
        current.map((item) => (item.id === exercise.id ? exercise : item)),
      );
      return exercise;
    },
    [adminRequest],
  );

  const deactivateExercise = useCallback(
    async (exerciseId: string) => {
      const exercise = await adminRequest<Exercise>(`/admin/exercises/${exerciseId}`, {
        method: "DELETE",
      });
      setItems((current) =>
        normalizedFilters.status === exercise.status
          ? current.map((item) => (item.id === exercise.id ? exercise : item))
          : current.filter((item) => item.id !== exercise.id),
      );
      setTotal((current) =>
        normalizedFilters.status === exercise.status ? current : Math.max(current - 1, 0),
      );
      return exercise;
    },
    [adminRequest, normalizedFilters.status],
  );

  const uploadExerciseImage = useCallback(
    async (exerciseId: string, file: File) => {
      const formData = new FormData();
      formData.set("image", file);
      const exercise = await adminRequest<Exercise>(
        `/admin/exercises/${exerciseId}/media`,
        { method: "POST", body: formData, headers: {} },
      );
      setItems((current) =>
        current.map((item) => (item.id === exercise.id ? exercise : item)),
      );
      return exercise;
    },
    [adminRequest],
  );

  const removeExerciseMedia = useCallback(
    async (exerciseId: string) => {
      const exercise = await adminRequest<Exercise>(
        `/admin/exercises/${exerciseId}/media`,
        { method: "DELETE" },
      );
      setItems((current) =>
        current.map((item) => (item.id === exercise.id ? exercise : item)),
      );
      return exercise;
    },
    [adminRequest],
  );

  return {
    createExercise,
    deactivateExercise,
    error,
    isLoading,
    items,
    refresh: loadExercises,
    removeExerciseMedia,
    total,
    updateExercise,
    uploadExerciseImage,
  };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Ocurrio un error inesperado";
}
