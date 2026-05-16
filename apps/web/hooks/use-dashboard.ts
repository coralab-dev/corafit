"use client";

import { useCallback, useEffect, useState } from "react";

type OnboardingChecklist = {
  hasCreatedClient: boolean;
  hasCreatedOrSelectedPlan: boolean;
  hasAssignedPlan: boolean;
  hasGeneratedAccess: boolean;
  hasPreviewedPortal: boolean;
};

export type DashboardStats = {
  totalClients: number;
  totalPlans: number;
  clientsWithPlan: number;
  clientsWithoutPlan: number;
  clientsWithAccess: number;
  checklist: OnboardingChecklist;
};

type ApiConfig = {
  apiUrl: string;
  bearerToken: string;
  organizationId: string;
};

const apiConfigStorageKey = "corafit_api_config";
const fallbackApiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

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

export function useDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [apiConfig] = useState(getApiConfig);
  const isApiReady = Boolean(apiConfig.bearerToken.trim() && apiConfig.organizationId.trim());

  const loadStats = useCallback(async () => {
    if (!isApiReady) {
      setStats(null);
      setError("Configura la conexion al API para ver el dashboard.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await apiRequest<DashboardStats>(
        "/dashboard/onboarding",
        { method: "GET" },
        apiConfig,
      );
      setStats(response);
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setIsLoading(false);
    }
  }, [apiConfig, isApiReady]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadStats();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadStats]);

  return { error, isApiReady, isLoading, refresh: loadStats, stats };
}
