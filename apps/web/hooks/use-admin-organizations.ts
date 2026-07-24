"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { useAdminOrganizationsContext } from "@/components/providers/admin-organizations-provider";
import { getOrganizationQueryKey, matchesOrganizationFilters } from "@/components/admin/organizations/organization-cache";
import { getNextSelectedId } from "@/components/admin/organizations/organization-state";
import type {
  AdminOrganization,
  AdminOrganizationFilters,
  AdminOrganizationStatusAction,
  OrganizationMutation,
} from "@/components/admin/organizations/organization-types";
import { authenticatedRequest } from "@/lib/api/authenticated-request";

export type {
  AdminOrganization,
  AdminOrganizationFilters,
  AdminOrganizationStatus,
  AdminOrganizationStatusAction,
  AdminSubscriptionPlan,
  OrganizationMutation,
} from "@/components/admin/organizations/organization-types";

export function useAdminOrganizations(filters: AdminOrganizationFilters) {
  const { profile, session, status: authStatus } = useAuth();
  const context = useAdminOrganizationsContext();
  const [selectedIdState, setSelectedId] = useState("");
  const [mutation, setMutation] = useState<OrganizationMutation | null>(null);
  const mutationRef = useRef<OrganizationMutation | null>(null);
  const selectedIdRef = useRef("");
  const filtersRef = useRef<AdminOrganizationFilters>({});
  const {
    cache,
    ensureOrganizations,
    ensureSubscriptionPlans,
    invalidateReads,
    isPlansLoading,
    loadingKeys,
    mergeOrganization,
    plans,
    plansError,
  } = context;

  const normalizedFilters = useMemo(
    () => ({
      search: filters.search?.trim() ?? "",
      status: filters.status ?? "all",
    } satisfies AdminOrganizationFilters),
    [filters.search, filters.status],
  );
  const queryKey = getOrganizationQueryKey(normalizedFilters);
  const cacheEntry = cache[queryKey];
  const items = useMemo(() => cacheEntry?.items ?? [], [cacheEntry]);
  const selectedId = selectedIdState && items.some((item) => item.id === selectedIdState)
    ? selectedIdState
    : "";
  const isApiReady =
    authStatus === "authenticated" &&
    Boolean(session) &&
    profile?.user.platformRole === "admin_saas";

  const selectedOrganization = items.find((item) => item.id === selectedId) ?? null;
  const isInitialLoading = isApiReady && !cacheEntry;
  const isRefreshing = Boolean(cacheEntry && loadingKeys[queryKey]);
  const listError = cacheEntry?.error ?? (!isApiReady && authStatus !== "loading" ? "Inicia sesión como admin." : "");

  const adminRequest = useCallback(
    <T,>(path: string, init: RequestInit = {}) =>
      authenticatedRequest<T>(path, init, { session }),
    [session],
  );

  const selectOrganization = useCallback(
    (organizationId: string) => {
      if (!items.some((item) => item.id === organizationId)) {
        return;
      }
      selectedIdRef.current = organizationId;
      setSelectedId(organizationId);
    },
    [items],
  );

  const refresh = useCallback(async () => {
    if (!isApiReady) {
      return [];
    }
    return ensureOrganizations(filtersRef.current, { force: true });
  }, [ensureOrganizations, isApiReady]);

  const beginMutation = useCallback((nextMutation: OrganizationMutation) => {
    if (mutationRef.current) {
      throw new Error("Ya hay una actualización en curso.");
    }

    invalidateReads();
    mutationRef.current = nextMutation;
    setMutation(nextMutation);
  }, [invalidateReads]);

  const finishMutation = useCallback((nextMutation: OrganizationMutation) => {
    if (
      mutationRef.current?.organizationId === nextMutation.organizationId &&
      mutationRef.current.kind === nextMutation.kind
    ) {
      mutationRef.current = null;
      setMutation(null);
    }
  }, []);

  const syncCurrentFilters = useCallback(() => {
    const currentFilters = filtersRef.current;
    void ensureOrganizations(currentFilters, { force: true });
  }, [ensureOrganizations]);

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
        mergeOrganization(organization);
        return organization;
      } finally {
        finishMutation(nextMutation);
        if (!mutationRef.current) {
          syncCurrentFilters();
        }
      }
    }, [adminRequest, beginMutation, finishMutation, mergeOrganization, syncCurrentFilters],
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
        const currentFilters = filtersRef.current;
        const previousItems = items;
        const shouldKeep = matchesOrganizationFilters(organization, currentFilters);
        if (!shouldKeep && selectedIdRef.current === organizationId) {
          const nextItems = previousItems.filter((item) => item.id !== organizationId);
          const nextSelectedId = getNextSelectedId(nextItems, organizationId, previousItems);
          selectedIdRef.current = nextSelectedId;
          setSelectedId(nextSelectedId);
        }
        mergeOrganization(organization);
        return organization;
      } finally {
        finishMutation(nextMutation);
        if (!mutationRef.current) {
          syncCurrentFilters();
        }
      }
    }, [adminRequest, beginMutation, finishMutation, items, mergeOrganization, syncCurrentFilters],
  );

  useEffect(() => {
    if (!isApiReady) {
      return;
    }

    void ensureOrganizations(normalizedFilters);
    void ensureSubscriptionPlans();
  }, [ensureOrganizations, ensureSubscriptionPlans, isApiReady, normalizedFilters, queryKey]);

  useEffect(() => {
    filtersRef.current = normalizedFilters;
    selectedIdRef.current = selectedId;
  }, [normalizedFilters, selectedId]);

  return {
    isInitialLoading,
    isPlansLoading,
    isRefreshing,
    listError,
    plansError,
    items,
    refresh,
    retryPlans: useCallback(
      () => ensureSubscriptionPlans({ force: true }),
      [ensureSubscriptionPlans],
    ),
    selectOrganization,
    selectedId,
    selectedOrganization,
    subscriptionPlans: plans,
    mutation,
    updateOrganizationSubscription,
    updateOrganizationStatus,
  };
}
