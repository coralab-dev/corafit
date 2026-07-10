"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { authenticatedRequest, CoraFitApiError } from "@/lib/api/authenticated-request";

export type PrimaryMuscle =
  | "chest"
  | "back"
  | "legs"
  | "shoulder"
  | "biceps"
  | "triceps"
  | "core"
  | "glute";

export type Equipment =
  | "barbell"
  | "dumbbell"
  | "cable"
  | "machine"
  | "bodyweight"
  | "other";

export type ExerciseType = "global" | "custom" | "all";
export type ExerciseMediaType = "image" | "video_url";

export type Exercise = {
  id: string;
  organizationId: string | null;
  createdByUserId: string | null;
  name: string;
  primaryMuscle: PrimaryMuscle;
  secondaryMuscles: string[];
  equipment: Equipment;
  instructions: string | null;
  recommendations: string | null;
  mediaUrl: string | null;
  mediaType: ExerciseMediaType | null;
  videoUrl: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type ExerciseFilters = {
  search?: string;
  primaryMuscle?: PrimaryMuscle | "all";
  equipment?: Equipment | "all";
  type?: ExerciseType;
};

export type CreateExerciseInput = {
  name: string;
  primaryMuscle: PrimaryMuscle;
  equipment: Equipment;
  instructions?: string;
  recommendations?: string;
  secondaryMuscles?: string[];
  imageFile?: File | null;
  videoUrl?: string;
};

export type UpdateExerciseInput = {
  name?: string;
  primaryMuscle?: PrimaryMuscle;
  equipment?: Equipment;
  instructions?: string | null;
  recommendations?: string | null;
  secondaryMuscles?: string[];
  mediaUrl?: string | null;
  mediaType?: ExerciseMediaType | null;
  videoUrl?: string | null;
};

type ExercisesResponse = {
  items: Exercise[];
  page: number;
  limit: number;
  total: number;
};

type ExerciseRequest = <T>(path: string, init?: RequestInit) => Promise<T>;

export function useExercises(filters: ExerciseFilters) {
  const { profile, session, status: authStatus } = useAuth();
  const [items, setItems] = useState<Exercise[]>([]);
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

  const loadExercises = useCallback(async () => {
    if (!isApiReady) {
      setItems([]);
      setTotal(0);
      setError(
        authStatus === "loading"
          ? ""
          : "Inicia sesión y selecciona una organización para ver tus ejercicios.",
      );
      return;
    }

    setIsRequestLoading(true);
    setError("");

    try {
      const searchParams = new URLSearchParams({
        limit: "50",
        page: "1",
        type: filters.type ?? "all",
      });

      if (filters.search?.trim()) {
        searchParams.set("search", filters.search.trim());
      }
      if (filters.primaryMuscle && filters.primaryMuscle !== "all") {
        searchParams.set("primaryMuscle", filters.primaryMuscle);
      }
      if (filters.equipment && filters.equipment !== "all") {
        searchParams.set("equipment", filters.equipment);
      }

      const response = await request<ExercisesResponse>(
        `/exercises?${searchParams.toString()}`,
        { method: "GET" },
      );

      setItems(response.items);
      setTotal(response.total);
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setIsRequestLoading(false);
    }
  }, [authStatus, filters.equipment, filters.primaryMuscle, filters.search, filters.type, isApiReady, request]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadExercises();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadExercises]);

  const createExercise = useCallback(
    async (input: CreateExerciseInput) => {
      if (!isApiReady) {
        throw new Error("Inicia sesión y selecciona una organización para crear ejercicios.");
      }

      let exercise = await request<Exercise>(
        "/exercises/custom",
        {
          method: "POST",
          body: JSON.stringify({
            name: input.name,
            primaryMuscle: input.primaryMuscle,
            equipment: input.equipment,
            instructions: input.instructions?.trim() || undefined,
            recommendations: input.recommendations?.trim() || undefined,
            secondaryMuscles: input.secondaryMuscles,
            videoUrl: input.videoUrl?.trim() || undefined,
          }),
        },
      );

      if (input.imageFile) {
        exercise = await uploadExerciseImageRequest(
          exercise.id,
          input.imageFile,
          request,
        );
      }

      setItems((current) => [exercise, ...current]);
      setTotal((current) => current + 1);
      return exercise;
    },
    [isApiReady, request],
  );

  return {
    createExercise,
    error,
    isApiReady,
    isLoading,
    items,
    refresh: loadExercises,
    total,
  };
}

export function useExerciseMediaActions() {
  const { profile, session, status: authStatus } = useAuth();
  const organizationId = profile?.organization?.id ?? null;
  const isApiReady = authStatus === "authenticated" && Boolean(session && organizationId);

  const request = useCallback(
    <T,>(path: string, init: RequestInit = {}) =>
      authenticatedRequest<T>(path, init, { organizationId, session }),
    [organizationId, session],
  );

  const uploadExerciseImage = useCallback(
    (exerciseId: string, file: File) => {
      if (!isApiReady) {
        throw new Error("Inicia sesión y selecciona una organización para modificar ejercicios.");
      }

      return uploadExerciseImageRequest(exerciseId, file, request);
    },
    [isApiReady, request],
  );

  const removeExerciseMedia = useCallback(
    (exerciseId: string) => {
      if (!isApiReady) {
        throw new Error("Inicia sesión y selecciona una organización para modificar ejercicios.");
      }

      return request<Exercise>(
        `/exercises/${exerciseId}/media`,
        { method: "DELETE" },
      );
    },
    [isApiReady, request],
  );

  return { removeExerciseMedia, uploadExerciseImage };
}

export function useExerciseActions() {
  const { profile, session, status: authStatus } = useAuth();
  const organizationId = profile?.organization?.id ?? null;
  const isApiReady = authStatus === "authenticated" && Boolean(session && organizationId);

  const request = useCallback(
    <T,>(path: string, init: RequestInit = {}) =>
      authenticatedRequest<T>(path, init, { organizationId, session }),
    [organizationId, session],
  );

  const updateExercise = useCallback(
    (exerciseId: string, input: UpdateExerciseInput) => {
      if (!isApiReady) {
        throw new Error("Inicia sesión y selecciona una organización para modificar ejercicios.");
      }

      return request<Exercise>(
        `/exercises/${exerciseId}`,
        { method: "PATCH", body: JSON.stringify(input) },
      );
    },
    [isApiReady, request],
  );

  const deactivateExercise = useCallback(
    (exerciseId: string) => {
      if (!isApiReady) {
        throw new Error("Inicia sesión y selecciona una organización para modificar ejercicios.");
      }

      return request<Exercise>(
        `/exercises/${exerciseId}`,
        { method: "DELETE" },
      );
    },
    [isApiReady, request],
  );

  return { deactivateExercise, updateExercise };
}

async function uploadExerciseImageRequest(
  exerciseId: string,
  file: File,
  request: ExerciseRequest,
) {
  const formData = new FormData();
  formData.set("image", file);

  return request<Exercise>(
    `/exercises/${exerciseId}/media`,
    {
      method: "POST",
      body: formData,
    },
  );
}

function getErrorMessage(error: unknown) {
  if (error instanceof CoraFitApiError) {
    return error.payload.message ?? error.code ?? error.message;
  }

  return error instanceof Error ? error.message : "Ocurrió un error inesperado";
}
