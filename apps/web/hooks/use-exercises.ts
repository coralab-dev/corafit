"use client";

import { useCallback, useEffect, useState } from "react";

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
  imageFile?: File | null;
  videoUrl?: string;
};

type ExercisesResponse = {
  items: Exercise[];
  page: number;
  limit: number;
  total: number;
};

type ApiConfig = {
  apiUrl: string;
  bearerToken: string;
  organizationId: string;
};

const apiConfigStorageKey = "corafit_api_config";
const fallbackApiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export function useExercises(filters: ExerciseFilters) {
  const [items, setItems] = useState<Exercise[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [apiConfig] = useState(getApiConfig);

  const isApiReady = Boolean(
    apiConfig.bearerToken.trim() && apiConfig.organizationId.trim(),
  );

  const loadExercises = useCallback(async () => {
    if (!isApiReady) {
      setItems([]);
      setTotal(0);
      setError("Configura la conexion al API para leer ejercicios reales.");
      return;
    }

    setIsLoading(true);
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

      const response = await apiRequest<ExercisesResponse>(
        `/exercises?${searchParams.toString()}`,
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
  }, [apiConfig, filters.equipment, filters.primaryMuscle, filters.search, filters.type, isApiReady]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadExercises();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadExercises]);

  const createExercise = useCallback(
    async (input: CreateExerciseInput) => {
      if (!isApiReady) {
        throw new Error("Configura la conexion al API antes de crear ejercicios.");
      }

      let exercise = await apiRequest<Exercise>(
        "/exercises/custom",
        {
          method: "POST",
          body: JSON.stringify({
            name: input.name,
            primaryMuscle: input.primaryMuscle,
            equipment: input.equipment,
            instructions: input.instructions?.trim() || undefined,
            mediaType: input.videoUrl?.trim() ? "video_url" : undefined,
            mediaUrl: input.videoUrl?.trim() || undefined,
          }),
        },
        apiConfig,
      );

      if (input.imageFile) {
        exercise = await uploadExerciseImageRequest(
          exercise.id,
          input.imageFile,
          apiConfig,
        );
      }

      setItems((current) => [exercise, ...current]);
      setTotal((current) => current + 1);
      return exercise;
    },
    [apiConfig, isApiReady],
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
  const [apiConfig] = useState(getApiConfig);

  const uploadExerciseImage = useCallback(
    (exerciseId: string, file: File) =>
      uploadExerciseImageRequest(exerciseId, file, apiConfig),
    [apiConfig],
  );

  const removeExerciseMedia = useCallback(
    (exerciseId: string) =>
      apiRequest<Exercise>(
        `/exercises/${exerciseId}/media`,
        { method: "DELETE" },
        apiConfig,
      ),
    [apiConfig],
  );

  return { removeExerciseMedia, uploadExerciseImage };
}

async function uploadExerciseImageRequest(
  exerciseId: string,
  file: File,
  config: ApiConfig,
) {
  const formData = new FormData();
  formData.set("image", file);

  return apiRequest<Exercise>(
    `/exercises/${exerciseId}/media`,
    {
      method: "POST",
      body: formData,
      headers: {},
    },
    config,
  );
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
      Authorization: `Bearer ${config.bearerToken}`,
      "X-Organization-Id": config.organizationId,
      ...init.headers,
    },
  });

  if (!response.ok) {
    let message = `API ${response.status}`;
    try {
      const payload = (await response.json()) as { message?: string };
      message = payload.message ?? message;
    } catch {
      // Keep the generic HTTP message when the API does not return JSON.
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Ocurrio un error inesperado";
}
