import { z } from "zod";
import type {
  ApiConfig,
  ClientType,
  DayOfWeek,
  OperationalStatus,
  TrainingPlan,
  TrainingPlanWeek,
} from "./types";

export const clientSchema = z.object({
  name: z.string().trim().min(2, "Nombre requerido"),
  phone: z.string().trim().optional(),
  age: z.number().int().positive("Edad invalida").max(100).optional(),
  sex: z.string().trim().optional(),
  clientType: z.enum(["online", "presential", "hybrid"]),
  mainGoal: z.string().trim().min(3, "Objetivo requerido"),
  heightCm: z.number().positive("Altura requerida"),
  initialWeightKg: z.number().positive("Peso requerido"),
  trainingLevel: z.string().trim().optional(),
  injuriesNotes: z.string().trim().optional(),
  generalNotes: z.string().trim().optional(),
  canRegisterWeight: z.boolean(),
});

export type ClientFormValues = z.infer<typeof clientSchema>;

export const apiConfigStorageKey = "corafit_api_config";
export const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export function hasStoredApiConfig() {
  if (typeof window === "undefined") {
    return false;
  }

  return Boolean(window.localStorage.getItem(apiConfigStorageKey));
}

export function getInitialApiConfig(): ApiConfig {
  const fallback = {
    apiUrl: apiBaseUrl,
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
    return { ...fallback, ...JSON.parse(storedConfig) };
  } catch {
    return fallback;
  }
}

export const statusLabels: Record<OperationalStatus, string> = {
  active: "Activo",
  paused: "Pausado",
  inactive: "Inactivo",
  archived: "Archivado",
};

export const typeLabels: Record<ClientType, string> = {
  online: "Online",
  presential: "Presencial",
  hybrid: "Hibrido",
};

export const dayLabels: Record<DayOfWeek, string> = {
  friday: "Viernes",
  monday: "Lunes",
  saturday: "Sabado",
  sunday: "Domingo",
  thursday: "Jueves",
  tuesday: "Martes",
  wednesday: "Miercoles",
};

export const levelLabels: Record<string, string> = {
  advanced: "Avanzado",
  beginner: "Principiante",
  intermediate: "Intermedio",
};

export const emptyDefaults: ClientFormValues = {
  name: "",
  phone: "",
  age: 18,
  sex: "",
  clientType: "online",
  mainGoal: "",
  heightCm: 170,
  initialWeightKg: 70,
  trainingLevel: "",
  injuriesNotes: "",
  generalNotes: "",
  canRegisterWeight: true,
};

export function normalizeFormValues(values: ClientFormValues) {
  return {
    name: values.name.trim(),
    phone: values.phone?.trim() ?? "",
    age: values.age ?? 18,
    sex: values.sex?.trim() ?? "",
    clientType: values.clientType,
    mainGoal: values.mainGoal.trim(),
    heightCm: values.heightCm,
    initialWeightKg: values.initialWeightKg,
    trainingLevel: values.trainingLevel?.trim() ?? "",
    injuriesNotes: values.injuriesNotes?.trim() ?? "",
    generalNotes: values.generalNotes?.trim() ?? "",
    canRegisterWeight: values.canRegisterWeight,
  };
}

export function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function countSessions(plan: TrainingPlan) {
  return (plan.weeks ?? []).reduce(
    (total, week) => total + countWeekSessions(week),
    0,
  );
}

export function countWeekSessions(week: TrainingPlanWeek) {
  return (week.days ?? []).filter((day) => day.session).length;
}

export async function apiRequest<T>(
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

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}

export function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Ocurrio un error inesperado";
}

export function formatDate(value: string | null | undefined) {
  if (!value) {
    return undefined;
  }

  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
