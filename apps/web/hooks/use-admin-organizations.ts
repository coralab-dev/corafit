"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import {
  createLatestRequestController,
  getNextSelectedId,
} from "@/components/admin/organizations/organization-state";
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

export type AdminOrganizationStatusAction = "reactivate" | "suspend";

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

export type OrganizationMutation = {
  organizationId: string;
  kind: "plan" | "status";
};

export function useAdminOrganizations(filters: AdminOrganizationFilters) {
  const { profile, session, status: authStatus } = useAuth();
  const [items, setItems] = useState<AdminOrganization[]>([]);
  const [selectedOrganization, setSelectedOrganization] = useState<AdminOrganization | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isPlansLoading, setIsPlansLoading] = useState(false);
  const [listError, setListError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [plansError, setPlansError] = useState("");
  const [subscriptionPlans, setSubscriptionPlans] = useState<AdminSubscriptionPlan[]>([]);
  const [mutation, setMutation] = useState<OrganizationMutation | null>(null);

  const itemsRef = useRef<AdminOrganization[]>([]);
  const selectedIdRef = useRef("");
  const selectedOrganizationRef = useRef<AdminOrganization | null>(null);
  const mutationRef = useRef<OrganizationMutation | null>(null);
  const listRequests = useMemo(() => createLatestRequestController(), []);
  const detailRequests = useMemo(() => createLatestRequestController(), []);
  const plansRequests = useMemo(() => createLatestRequestController(), []);

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

  const commitItems = useCallback((nextItems: AdminOrganization[]) => {
    itemsRef.current = nextItems;
    setItems(nextItems);
  }, []);

  const commitSelectedId = useCallback((nextId: string) => {
    selectedIdRef.current = nextId;
    setSelectedId(nextId);
  }, []);

  const commitSelectedOrganization = useCallback((organization: AdminOrganization | null) => {
    selectedOrganizationRef.current = organization;
    setSelectedOrganization(organization);
  }, []);

  const selectOrganization = useCallback(
    (organizationId: string) => {
      commitSelectedId(organizationId);
      commitSelectedOrganization(null);
      setDetailError("");
    },
    [commitSelectedId, commitSelectedOrganization],
  );

  const loadOrganizations = useCallback(async () => {
    const request = listRequests.begin();

    if (!isApiReady) {
      commitItems([]);
      commitSelectedId("");
      commitSelectedOrganization(null);
      setIsInitialLoading(false);
      setIsRefreshing(false);
      setListError(authStatus === "loading" ? "" : "Inicia sesión como admin.");
      return [];
    }

    const hasPreviousItems = itemsRef.current.length > 0;
    setIsInitialLoading(!hasPreviousItems);
    setIsRefreshing(hasPreviousItems);
    setListError("");

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
        { method: "GET", signal: request.controller.signal },
      );

      if (!listRequests.isCurrent(request.id)) {
        return [];
      }

      const previousSelectedId = selectedIdRef.current;
      const nextSelectedId = getNextSelectedId(response, previousSelectedId, itemsRef.current);
      commitItems(response);
      commitSelectedId(nextSelectedId);
      if (nextSelectedId !== previousSelectedId) {
        commitSelectedOrganization(null);
      }

      return response;
    } catch (caughtError) {
      if (isCurrentNonAborted(listRequests, request.id, request.controller)) {
        setListError(getErrorMessage(caughtError));
      }
      return [];
    } finally {
      if (listRequests.isCurrent(request.id)) {
        setIsInitialLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [
    adminRequest,
    authStatus,
    commitItems,
    commitSelectedId,
    commitSelectedOrganization,
    isApiReady,
    listRequests,
    normalizedFilters,
  ]);

  const loadOrganization = useCallback(
    async (organizationId: string) => {
      const request = detailRequests.begin();

      if (!isApiReady || !organizationId) {
        commitSelectedOrganization(null);
        setDetailError("");
        setIsDetailLoading(false);
        return null;
      }

      setIsDetailLoading(true);
      setDetailError("");

      try {
        const organization = await adminRequest<AdminOrganization>(
          `/admin/organizations/${organizationId}`,
          { method: "GET", signal: request.controller.signal },
        );

        if (!isCurrentNonAborted(detailRequests, request.id, request.controller)) {
          return null;
        }

        if (selectedIdRef.current !== organizationId) {
          return null;
        }

        commitSelectedOrganization(organization);
        return organization;
      } catch (caughtError) {
        if (isCurrentNonAborted(detailRequests, request.id, request.controller)) {
          commitSelectedOrganization(null);
          setDetailError(getErrorMessage(caughtError));
        }
        return null;
      } finally {
        if (detailRequests.isCurrent(request.id)) {
          setIsDetailLoading(false);
        }
      }
    },
    [adminRequest, commitSelectedOrganization, detailRequests, isApiReady],
  );

  const loadSubscriptionPlans = useCallback(async () => {
    const request = plansRequests.begin();

    if (!isApiReady) {
      setSubscriptionPlans([]);
      setPlansError(authStatus === "loading" ? "" : "Inicia sesión como admin.");
      setIsPlansLoading(false);
      return [];
    }

    setIsPlansLoading(true);
    setPlansError("");

    try {
      const plans = await adminRequest<AdminSubscriptionPlan[]>(
        "/admin/subscription-plans",
        { method: "GET", signal: request.controller.signal },
      );

      if (!isCurrentNonAborted(plansRequests, request.id, request.controller)) {
        return [];
      }

      setSubscriptionPlans(plans);
      return plans;
    } catch (caughtError) {
      if (isCurrentNonAborted(plansRequests, request.id, request.controller)) {
        setPlansError(getErrorMessage(caughtError));
      }
      return [];
    } finally {
      if (plansRequests.isCurrent(request.id)) {
        setIsPlansLoading(false);
      }
    }
  }, [adminRequest, authStatus, isApiReady, plansRequests]);

  const refresh = useCallback(async () => {
    const response = await loadOrganizations();
    const currentSelectedId = selectedIdRef.current;

    if (currentSelectedId && response.some((item) => item.id === currentSelectedId)) {
      await loadOrganization(currentSelectedId);
    }

    return response;
  }, [loadOrganization, loadOrganizations]);

  const beginMutation = useCallback((nextMutation: OrganizationMutation) => {
    if (mutationRef.current) {
      throw new Error("Ya hay una actualización en curso.");
    }

    mutationRef.current = nextMutation;
    setMutation(nextMutation);
  }, []);

  const finishMutation = useCallback((nextMutation: OrganizationMutation) => {
    if (mutationRef.current?.organizationId === nextMutation.organizationId && mutationRef.current.kind === nextMutation.kind) {
      mutationRef.current = null;
      setMutation(null);
    }
  }, []);

  const updateOrganizationSubscription = useCallback(
    async (organizationId: string, planCode: string) => {
      const nextMutation: OrganizationMutation = { organizationId, kind: "plan" };
      beginMutation(nextMutation);

      try {
        const organization = await adminRequest<AdminOrganization>(
          `/admin/organizations/${organizationId}/subscription`,
          {
            method: "PATCH",
            body: JSON.stringify({ planCode }),
          },
        );

        const nextItems = itemsRef.current.map((item) =>
          item.id === organization.id ? organization : item,
        );
        commitItems(nextItems);
        if (selectedIdRef.current === organization.id) {
          commitSelectedOrganization(organization);
        }

        return organization;
      } finally {
        finishMutation(nextMutation);
      }
    }, [adminRequest, beginMutation, commitItems, commitSelectedOrganization, finishMutation],
  );

  const updateOrganizationStatus = useCallback(
    async (organizationId: string, action: AdminOrganizationStatusAction) => {
      const nextMutation: OrganizationMutation = { organizationId, kind: "status" };
      beginMutation(nextMutation);

      try {
        const organization = await adminRequest<AdminOrganization>(
          `/admin/organizations/${organizationId}/${action}`,
          { method: "POST" },
        );
        const previousItems = itemsRef.current;
        const shouldKeep =
          normalizedFilters.status === "all" || normalizedFilters.status === organization.status;
        const nextItems = shouldKeep
          ? previousItems.map((item) => (item.id === organization.id ? organization : item))
          : previousItems.filter((item) => item.id !== organization.id);

        commitItems(nextItems);

        if (shouldKeep) {
          if (selectedIdRef.current === organization.id) {
            commitSelectedOrganization(organization);
          }
        } else {
          const previousSelectedId = selectedIdRef.current;
          const nextSelectedId = getNextSelectedId(nextItems, previousSelectedId, previousItems);
          commitSelectedId(nextSelectedId);
          if (previousSelectedId === organization.id || !nextSelectedId) {
            commitSelectedOrganization(null);
          }
        }

        return organization;
      } finally {
        finishMutation(nextMutation);
      }
    }, [
      adminRequest,
      beginMutation,
      commitItems,
      commitSelectedId,
      commitSelectedOrganization,
      finishMutation,
      normalizedFilters.status,
    ],
  );

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

  useEffect(() => {
    return () => {
      listRequests.abort();
      detailRequests.abort();
      plansRequests.abort();
    };
  }, [detailRequests, listRequests, plansRequests]);

  useEffect(() => {
    if (selectedOrganizationRef.current && selectedOrganizationRef.current.id !== selectedId) {
      commitSelectedOrganization(null);
    }
  }, [commitSelectedOrganization, selectedId]);

  return {
    detailError,
    isDetailLoading,
    isInitialLoading,
    isPlansLoading,
    isRefreshing,
    listError,
    plansError,
    items,
    refresh,
    retryPlans: loadSubscriptionPlans,
    selectOrganization,
    selectedId,
    selectedOrganization,
    subscriptionPlans,
    mutation,
    updateOrganizationSubscription,
    updateOrganizationStatus,
  };
}

function isCurrentNonAborted(
  requests: ReturnType<typeof createLatestRequestController>,
  id: number,
  controller: AbortController,
) {
  return requests.isCurrent(id) && !controller.signal.aborted;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Ocurrió un error inesperado";
}
