"use client";

import type { Session } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/auth/supabase";

export const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type CoraFitApiErrorPayload = {
  error?: string;
  message?: string;
};

export class CoraFitApiError extends Error {
  code?: string;
  status: number;

  constructor(status: number, payload: CoraFitApiErrorPayload) {
    super(payload.message ?? payload.error ?? `API ${status}`);
    this.name = "CoraFitApiError";
    this.status = status;
    this.code = payload.error;
  }
}

export async function getCurrentAccessToken() {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return data.session?.access_token ?? null;
}

export async function authenticatedRequest<T>(
  path: string,
  init: RequestInit = {},
  options: { organizationId?: string | null; session?: Session | null } = {},
): Promise<T> {
  const token = options.session?.access_token ?? (await getCurrentAccessToken());

  if (!token) {
    throw new CoraFitApiError(401, {
      error: "SESSION_NOT_FOUND",
      message: "Inicia sesion para continuar.",
    });
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(init.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      Authorization: `Bearer ${token}`,
      ...(options.organizationId ? { "X-Organization-Id": options.organizationId } : {}),
      ...init.headers,
    },
  });

  if (!response.ok) {
    throw await toApiError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

async function toApiError(response: Response) {
  try {
    const payload = (await response.json()) as CoraFitApiErrorPayload;
    return new CoraFitApiError(response.status, payload);
  } catch {
    return new CoraFitApiError(response.status, {
      message: `API ${response.status}`,
    });
  }
}
