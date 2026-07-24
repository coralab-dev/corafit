"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "./auth-provider";
import { authenticatedRequest } from "@/lib/api/authenticated-request";
import {
  createDataRevisionController,
} from "@/components/admin/organizations/organization-state";
import {
  getOrganizationQueryKey,
  isOrganizationCacheFresh,
  matchesOrganizationFilters,
} from "@/components/admin/organizations/organization-cache";
import type {
  AdminOrganization,
  AdminOrganizationFilters,
  AdminSubscriptionPlan,
} from "@/components/admin/organizations/organization-types";

export type OrganizationCacheEntry = {
  error: string;
  items: AdminOrganization[];
  loadedAt: number;
};

type ListRequest = {
  controller: AbortController;
  id: number;
  promise: Promise<AdminOrganization[]>;
  revision: number;
};

type AdminOrganizationsContextValue = {
  cache: Record<string, OrganizationCacheEntry>;
  ensureOrganizations: (
    filters: AdminOrganizationFilters,
    options?: { force?: boolean },
  ) => Promise<AdminOrganization[]>;
  ensureSubscriptionPlans: (options?: { force?: boolean }) => Promise<AdminSubscriptionPlan[]>;
  invalidateReads: () => void;
  isPlansLoading: boolean;
  loadingKeys: Record<string, boolean>;
  mergeOrganization: (organization: AdminOrganization) => void;
  plans: AdminSubscriptionPlan[];
  plansError: string;
};

const AdminOrganizationsContext = createContext<AdminOrganizationsContextValue | null>(null);

export function AdminOrganizationsProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [cache, setCache] = useState<Record<string, OrganizationCacheEntry>>({});
  const [loadingKeys, setLoadingKeys] = useState<Record<string, boolean>>({});
  const [plans, setPlans] = useState<AdminSubscriptionPlan[]>([]);
  const [plansError, setPlansError] = useState("");
  const [isPlansLoading, setIsPlansLoading] = useState(false);
  const [plansLoadedAt, setPlansLoadedAt] = useState(0);

  const cacheRef = useRef(cache);
  const filtersByKeyRef = useRef(new Map<string, AdminOrganizationFilters>());
  const listRequestsRef = useRef(new Map<string, ListRequest>());
  const plansRequestRef = useRef<{
    controller: AbortController;
    id: number;
    promise: Promise<AdminSubscriptionPlan[]>;
  } | null>(null);
  const requestIdRef = useRef(0);
  const plansRef = useRef(plans);
  const plansLoadedAtRef = useRef(plansLoadedAt);
  const dataRevision = useMemo(() => createDataRevisionController(), []);

  useEffect(() => {
    cacheRef.current = cache;
    plansRef.current = plans;
    plansLoadedAtRef.current = plansLoadedAt;
  }, [cache, plans, plansLoadedAt]);

  const commitCache = useCallback((nextCache: Record<string, OrganizationCacheEntry>) => {
    cacheRef.current = nextCache;
    setCache(nextCache);
  }, []);

  const setLoading = useCallback((key: string, value: boolean) => {
    setLoadingKeys((previous) => {
      const next = { ...previous };
      if (value) {
        next[key] = true;
      } else {
        delete next[key];
      }
      return next;
    });
  }, []);

  const invalidateReads = useCallback(() => {
    dataRevision.invalidate();
    for (const request of listRequestsRef.current.values()) {
      request.controller.abort();
    }
    listRequestsRef.current.clear();
    setLoadingKeys({});
  }, [dataRevision]);

  const ensureOrganizations = useCallback(
    async (filters: AdminOrganizationFilters, options: { force?: boolean } = {}) => {
      const normalizedFilters = {
        search: filters.search?.trim() ?? "",
        status: filters.status ?? "all",
      } satisfies AdminOrganizationFilters;
      const key = getOrganizationQueryKey(normalizedFilters);
      filtersByKeyRef.current.set(key, normalizedFilters);
      const existing = cacheRef.current[key];
      const activeRequest = listRequestsRef.current.get(key);

      if (!options.force && existing && isOrganizationCacheFresh(existing.loadedAt)) {
        return existing.items;
      }

      if (!options.force && activeRequest) {
        return activeRequest.promise;
      }

      activeRequest?.controller.abort();
      const request = {
        controller: new AbortController(),
        id: ++requestIdRef.current,
        promise: Promise.resolve([] as AdminOrganization[]),
        revision: dataRevision.capture(),
      } satisfies ListRequest;
      listRequestsRef.current.set(key, request);
      setLoading(key, true);

      const searchParams = new URLSearchParams();
      if (normalizedFilters.search) {
        searchParams.set("search", normalizedFilters.search);
      }
      if (normalizedFilters.status !== "all") {
        searchParams.set("status", normalizedFilters.status);
      }

      const query = searchParams.toString();
      const promise = (async () => {
        try {
          const response = await authenticatedRequest<AdminOrganization[]>(
            `/admin/organizations${query ? `?${query}` : ""}`,
            { method: "GET", signal: request.controller.signal },
            { session },
          );

          if (!isCurrentListRequest(key, request, listRequestsRef.current, dataRevision)) {
            return cacheRef.current[key]?.items ?? [];
          }

          const nextCache = {
            ...cacheRef.current,
            [key]: { error: "", items: response, loadedAt: Date.now() },
          };
          commitCache(nextCache);
          return response;
        } catch (caughtError) {
          if (isCurrentListRequest(key, request, listRequestsRef.current, dataRevision) && !request.controller.signal.aborted) {
            commitCache({
              ...cacheRef.current,
              [key]: {
                error: getErrorMessage(caughtError),
                items: existing?.items ?? [],
                loadedAt: existing?.loadedAt ?? 0,
              },
            });
          }
          return existing?.items ?? [];
        } finally {
          if (isCurrentListRequest(key, request, listRequestsRef.current, dataRevision)) {
            listRequestsRef.current.delete(key);
            setLoading(key, false);
          }
        }
      })();

      request.promise = promise;
      return promise;
    }, [commitCache, dataRevision, session, setLoading],
  );

  const ensureSubscriptionPlans = useCallback(
    async (options: { force?: boolean } = {}) => {
      if (!options.force && plansLoadedAtRef.current && isOrganizationCacheFresh(plansLoadedAtRef.current)) {
        return plansRef.current;
      }

      const currentRequest = plansRequestRef.current;
      if (!options.force && currentRequest) {
        return currentRequest.promise;
      }

      currentRequest?.controller.abort();
      const request = {
        controller: new AbortController(),
        id: ++requestIdRef.current,
        promise: Promise.resolve([] as AdminSubscriptionPlan[]),
      };
      plansRequestRef.current = request;
      setIsPlansLoading(true);
      setPlansError("");

      const promise = (async () => {
        try {
          const response = await authenticatedRequest<AdminSubscriptionPlan[]>(
            "/admin/subscription-plans",
            { method: "GET", signal: request.controller.signal },
            { session },
          );
          if (plansRequestRef.current?.id !== request.id || request.controller.signal.aborted) {
            return plansRef.current;
          }
          plansRef.current = response;
          setPlans(response);
          setPlansLoadedAt(Date.now());
          plansLoadedAtRef.current = Date.now();
          return response;
        } catch (caughtError) {
          if (plansRequestRef.current?.id === request.id && !request.controller.signal.aborted) {
            setPlansError(getErrorMessage(caughtError));
          }
          return plansRef.current;
        } finally {
          if (plansRequestRef.current?.id === request.id) {
            plansRequestRef.current = null;
            setIsPlansLoading(false);
          }
        }
      })();

      request.promise = promise;
      return promise;
    }, [session],
  );

  const mergeOrganization = useCallback((organization: AdminOrganization) => {
    const nextCache = { ...cacheRef.current };
    for (const [key, entry] of Object.entries(cacheRef.current)) {
      const filters = filtersByKeyRef.current.get(key);
      const index = entry.items.findIndex((item) => item.id === organization.id);
      if (index === -1 || !filters) {
        continue;
      }

      const nextItems = matchesOrganizationFilters(organization, filters)
        ? entry.items.map((item) => (item.id === organization.id ? organization : item))
        : entry.items.filter((item) => item.id !== organization.id);
      nextCache[key] = { ...entry, items: nextItems };
    }
    commitCache(nextCache);
  }, [commitCache]);

  useEffect(() => {
    return () => {
      invalidateReads();
      plansRequestRef.current?.controller.abort();
      plansRequestRef.current = null;
    };
  }, [invalidateReads]);

  const value = useMemo<AdminOrganizationsContextValue>(
    () => ({
      cache,
      ensureOrganizations,
      ensureSubscriptionPlans,
      invalidateReads,
      isPlansLoading,
      loadingKeys,
      mergeOrganization,
      plans,
      plansError,
    }),
    [
      cache,
      ensureOrganizations,
      ensureSubscriptionPlans,
      invalidateReads,
      isPlansLoading,
      loadingKeys,
      mergeOrganization,
      plans,
      plansError,
    ],
  );

  return <AdminOrganizationsContext.Provider value={value}>{children}</AdminOrganizationsContext.Provider>;
}

export function useAdminOrganizationsContext() {
  const context = useContext(AdminOrganizationsContext);
  if (!context) {
    throw new Error("useAdminOrganizations debe usarse dentro de AdminOrganizationsProvider.");
  }
  return context;
}

function isCurrentListRequest(
  key: string,
  request: ListRequest,
  requests: Map<string, ListRequest>,
  revision: ReturnType<typeof createDataRevisionController>,
) {
  return requests.get(key)?.id === request.id && revision.isCurrent(request.revision) && !request.controller.signal.aborted;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Ocurrió un error inesperado";
}
