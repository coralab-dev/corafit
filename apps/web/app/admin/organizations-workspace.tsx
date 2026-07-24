"use client";

import { Loader2Icon, RefreshCwIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { DetailDrawer } from "@/components/shared/detail-drawer";
import { Button } from "@/components/ui/button";
import {
  WorkspaceFrame,
  WorkspaceHeader,
  WorkspaceSplit,
} from "@/components/layout/workspace-shell";
import {
  type AdminOrganizationStatus,
  useAdminOrganizations,
} from "@/hooks/use-admin-organizations";
import {
  OrganizationMetrics,
  OrganizationMetricsSkeleton,
} from "@/components/admin/organizations/organization-metrics";
import { OrganizationList } from "@/components/admin/organizations/organization-list";
import { OrganizationDetail } from "@/components/admin/organizations/organization-detail";
import { organizationSearchDebounceMs } from "@/components/admin/organizations/organization-state";
import { getOrganizationMetrics } from "@/components/admin/organizations/organization-formatters";

export function AdminOrganizationsWorkspace() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<AdminOrganizationStatus | "all">("all");
  const [isCompactLayout, setIsCompactLayout] = useState(false);
  const [drawerOrganizationId, setDrawerOrganizationId] = useState("");

  const {
    detailError,
    isDetailLoading,
    isInitialLoading,
    isPlansLoading,
    isRefreshing,
    listError,
    plansError,
    items,
    refresh,
    retryPlans,
    selectOrganization,
    selectedId,
    selectedOrganization,
    subscriptionPlans,
    mutation,
    updateOrganizationSubscription,
    updateOrganizationStatus,
  } = useAdminOrganizations({ search: debouncedSearch, status });

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), organizationSearchDebounceMs);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1279px)");
    const updateLayout = () => setIsCompactLayout(mediaQuery.matches);
    updateLayout();
    mediaQuery.addEventListener("change", updateLayout);
    return () => mediaQuery.removeEventListener("change", updateLayout);
  }, []);

  const metrics = getOrganizationMetrics(items);
  const hasFilters = Boolean(search.trim() || status !== "all");
  const selectedListItem = items.find((item) => item.id === selectedId) ?? null;

  function handleClearFilters() {
    setSearch("");
    setDebouncedSearch("");
    setStatus("all");
  }

  function handleSelect(organizationId: string) {
    selectOrganization(organizationId);
    if (isCompactLayout) {
      setDrawerOrganizationId(organizationId);
    }
  }

  function renderOrganizationDetail() {
    return (
      <OrganizationDetail
          detailError={detailError}
          isLoading={isDetailLoading}
          isPlansLoading={isPlansLoading}
        plansError={plansError}
        organization={selectedOrganization}
        subscriptionPlans={subscriptionPlans}
        mutation={mutation}
        onRetryPlans={() => void retryPlans()}
        onChangePlan={updateOrganizationSubscription}
        onChangeStatus={updateOrganizationStatus}
      />
    );
  }

  return (
    <WorkspaceFrame
      header={
        <WorkspaceHeader
          title="Organizaciones"
          description="Supervisa cuentas, uso y suscripciones de la plataforma."
          actions={
            <Button
              type="button"
              variant="outline"
              className="shadow-none"
              disabled={isRefreshing || isInitialLoading}
              onClick={() => void refresh()}
            >
              {isRefreshing ? (
                <Loader2Icon aria-hidden="true" className="size-4 animate-spin" />
              ) : (
                <RefreshCwIcon aria-hidden="true" className="size-4" />
              )}
              {isRefreshing ? "Actualizando…" : "Actualizar"}
            </Button>
          }
        />
      }
    >
      <WorkspaceSplit
        main={
          <section className="min-w-0 space-y-5 bg-background p-4 md:p-5">
            {isInitialLoading && items.length === 0 ? (
              <OrganizationMetricsSkeleton />
            ) : (
              <OrganizationMetrics metrics={metrics} />
            )}
            <OrganizationList
              items={items}
              selectedId={selectedId}
              isInitialLoading={isInitialLoading}
              isRefreshing={isRefreshing}
              listError={listError}
              search={search}
              status={status}
              onSearchChange={setSearch}
              onStatusChange={setStatus}
              onSelect={handleSelect}
              onClearFilters={handleClearFilters}
              onRetry={() => void refresh()}
            />
          </section>
        }
        side={renderOrganizationDetail()}
        sideClassName="hidden xl:block xl:w-[380px] xl:min-w-[340px]"
      />
      {isCompactLayout ? (
        <DetailDrawer
          open={drawerOrganizationId === selectedId && Boolean(selectedId)}
          onOpenChange={(open) => {
            if (!open) {
              setDrawerOrganizationId("");
            }
          }}
          title={selectedOrganization?.name ?? selectedListItem?.name ?? "Detalle de organización"}
          description="Detalle operativo y acciones administrativas."
        >
          <div className="h-full overflow-y-auto">{renderOrganizationDetail()}</div>
        </DetailDrawer>
      ) : null}
      {hasFilters ? <span className="sr-only">Filtros activos</span> : null}
    </WorkspaceFrame>
  );
}
