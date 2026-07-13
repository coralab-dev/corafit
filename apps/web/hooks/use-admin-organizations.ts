"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { authenticatedRequest } from "@/lib/api/authenticated-request";

export type AdminOrganizationStatus = "active" | "suspended" | "cancelled";

export type AdminOrganizationFilters = {
  search?: string;
  status?: AdminOrganizationStatus | "all";
};

export type AdminOrganization = {
  id: string;
  name: string;
  type: string;
  status: AdminOrganizationStatus;
  createdAt: string;
  owner: {
    id: string;
    name: string;
    email: string;
  };
  subscription: {
    status: string;
  } | null;
  plan: {
    id: string;
    code: string;
    name: string;
    clientLimit: number;
  } | null;
  clientsUsed: number;
};

<<<<<<< HEAD
=======
export type AdminOrganizationStatusAction = "reactivate" | "suspend";

>>>>>>> origin/staging
export type AdminSubscriptionPlan = {
  id: string;
  code: string;
  name: string;
  status: "active" | "inactive";
  isPublic: boolean;
  betaPrice: number;
  postBetaPrice: number | null;
  currency: string;
  clientLimit: number;
  memberLimit: number;
  sortOrder: number | null;
  createdAt: string;
  updatedAt: string;
};

export function useAdminOrganizations(filters: AdminOrganizationFilters) {
  const { profile, session, status: authStatus } = useAuth();
  const [items, setItems] = useState<AdminOrganization[]>([]);
  const [selectedOrganization, setSelectedOrganization] =
    useState<AdminOrganization | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isPlansLoading, setIsPlansLoading] = useState(false);
  const [error, setError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [subscriptionPlans, setSubscriptionPlans] = useState<AdminSubscriptionPlan[]>([]);

  const isApiReady =
    authStatus === "authenticated" &&
    Boolean(session) &&
    profile?.user.platformRole === "admin_saas";

  const normalizedFilters = useMemo(
    () => ({
      search: filters.search?.trim() ?? "",
      status: filters.status ?? "all",
    }),
    [filters.search, filters.status],
  );

  const adminRequest = useCallback(
    <T,>(path: string, init: RequestInit = {}) =>
      authenticatedRequest<T>(path, init, { session }),
    [session],
  );

  const loadOrganizations = useCallback(async () => {
    if (!isApiReady) {
      setItems([]);
      setSelectedOrganization(null);
      setSelectedId("");
      setError(authStatus === "loading" ? "" : "Inicia sesion como admin.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const searchParams = new URLSearchParams();

      if (normalizedFilters.search) {
        searchParams.set("search", normalizedFilters.search);
      }

      if (normalizedFilters.status !== "all") {
        searchParams.set("status", normalizedFilters.status);
      }

      const query = searchParams.toString();
      const response = await adminRequest<AdminOrganization[]>(
        `/admin/organizations${query ? `?${query}` : ""}`,
        { method: "GET" },
      );

      setItems(response);
      setSelectedId((current) =>
        response.some((organization) => organization.id === current)
          ? current
          : response[0]?.id ?? "",
      );
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setIsLoading(false);
    }
  }, [adminRequest, authStatus, isApiReady, normalizedFilters]);

  const loadOrganization = useCallback(
    async (organizationId: string) => {
      if (!isApiReady || !organizationId) {
        setSelectedOrganization(null);
        setDetailError("");
        return;
      }

      setIsDetailLoading(true);
      setDetailError("");

      try {
        const organization = await adminRequest<AdminOrganization>(
          `/admin/organizations/${organizationId}`,
          { method: "GET" },
        );
        setSelectedOrganization(organization);
      } catch (caughtError) {
        setSelectedOrganization(null);
        setDetailError(getErrorMessage(caughtError));
      } finally {
        setIsDetailLoading(false);
      }
    },
    [adminRequest, isApiReady],
  );

  const loadSubscriptionPlans = useCallback(async () => {
    if (!isApiReady) {
      setSubscriptionPlans([]);
      return;
    }

    setIsPlansLoading(true);

    try {
      const plans = await adminRequest<AdminSubscriptionPlan[]>(
        "/admin/subscription-plans",
        { method: "GET" },
      );
      setSubscriptionPlans(plans);
    } finally {
      setIsPlansLoading(false);
    }
  }, [adminRequest, isApiReady]);

  const updateOrganizationSubscription = useCallback(
    async (organizationId: string, planCode: string) => {
      const organization = await adminRequest<AdminOrganization>(
        `/admin/organizations/${organizationId}/subscription`,
        {
          method: "PATCH",
          body: JSON.stringify({ planCode }),
        },
      );

      setSelectedOrganization(organization);
      setItems((current) =>
        current.map((item) =>
          item.id === organization.id ? organization : item,
        ),
      );

      return organization;
    },
    [adminRequest],
  );

<<<<<<< HEAD
=======
  const updateOrganizationStatus = useCallback(
    async (
      organizationId: string,
      action: AdminOrganizationStatusAction,
    ) => {
      const organization = await adminRequest<AdminOrganization>(
        `/admin/organizations/${organizationId}/${action}`,
        { method: "POST" },
      );
      const shouldKeep =
        normalizedFilters.status === "all" ||
        normalizedFilters.status === organization.status;

      if (shouldKeep) {
        setItems((current) =>
          current.map((item) =>
            item.id === organization.id ? organization : item,
          ),
        );
        setSelectedOrganization(organization);
      } else {
        setItems((current) =>
          current.filter((item) => item.id !== organization.id),
        );
        setSelectedId("");
        setSelectedOrganization(null);
      }

      return organization;
    },
    [adminRequest, normalizedFilters.status],
  );

>>>>>>> origin/staging
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadOrganizations();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadOrganizations]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadOrganization(selectedId);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadOrganization, selectedId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadSubscriptionPlans();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadSubscriptionPlans]);

  return {
    detailError,
    error,
    isDetailLoading,
    isLoading,
    isPlansLoading,
    items,
    refresh: loadOrganizations,
    selectOrganization: setSelectedId,
    selectedId,
    selectedOrganization,
    subscriptionPlans,
    updateOrganizationSubscription,
<<<<<<< HEAD
=======
    updateOrganizationStatus,
>>>>>>> origin/staging
  };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Ocurrio un error inesperado";
}
