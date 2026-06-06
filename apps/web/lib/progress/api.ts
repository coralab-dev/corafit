import type { ApiConfig } from "@/lib/clients/types";

export type ProgressActor = "coach" | "client";
export type ProgressPhotoType = "front" | "side" | "back" | "other";
export type FollowUpNoteVisibility = "private" | "visible_to_client";

export type WeightLog = {
  id: string;
  clientId: string;
  note: string | null;
  recordedAt: string;
  recordedByType: ProgressActor;
  weightKg: number;
};

export type BodyMeasurementLog = {
  id: string;
  clientId: string;
  armCm: number | null;
  chestCm: number | null;
  gluteCm: number | null;
  hipCm: number | null;
  legCm: number | null;
  note: string | null;
  recordedAt: string;
  visibleToClient: boolean;
  waistCm: number | null;
};

export type ProgressPhoto = {
  id: string;
  clientId: string;
  photoType: ProgressPhotoType;
  recordedAt: string;
  signedUrl: string;
  uploadedByType: ProgressActor;
};

export type FollowUpNote = {
  id: string;
  clientId: string;
  createdAt: string;
  text: string;
  visibility: FollowUpNoteVisibility;
};

export type WeightLogInput = {
  note?: string | null;
  recordedAt?: string;
  weightKg: number;
};

export type BodyMeasurementInput = {
  armCm?: number | null;
  chestCm?: number | null;
  gluteCm?: number | null;
  hipCm?: number | null;
  legCm?: number | null;
  note?: string | null;
  recordedAt?: string;
  visibleToClient?: boolean;
  waistCm?: number | null;
};

export type FollowUpNoteInput = {
  text: string;
  visibility: FollowUpNoteVisibility;
};

export async function progressRequest<T>(
  path: string,
  init: RequestInit,
  config: ApiConfig,
): Promise<T> {
  const response = await fetch(`${config.apiUrl}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.bearerToken}`,
      "X-Organization-Id": config.organizationId,
      ...init.headers,
    },
  });

  return readProgressResponse<T>(response);
}

export async function progressFormDataRequest<T>(
  path: string,
  formData: FormData,
  config: ApiConfig,
): Promise<T> {
  const response = await fetch(`${config.apiUrl}${path}`, {
    method: "POST",
    body: formData,
    credentials: "include",
    headers: {
      Authorization: `Bearer ${config.bearerToken}`,
      "X-Organization-Id": config.organizationId,
    },
  });

  return readProgressResponse<T>(response);
}

export function getProgressErrorMessage(error: unknown, fallback = "No pudimos completar la accion.") {
  return error instanceof Error ? error.message : fallback;
}

async function readProgressResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `API ${response.status}`;
    try {
      const payload = (await response.json()) as { message?: string | string[] };
      if (Array.isArray(payload.message)) {
        message = payload.message.join(". ");
      } else {
        message = payload.message ?? message;
      }
    } catch {
      // Keep generic HTTP message.
    }
    const error = new Error(message);
    error.name = response.status === 403 ? "ForbiddenError" : "ProgressApiError";
    throw error;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  return text ? (JSON.parse(text) as T) : (undefined as T);
}
