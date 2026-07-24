"use client";

import { Loader2Icon, RefreshCwIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { DetailDrawer } from "@/components/shared/detail-drawer";
import { Button } from "@/components/ui/button";
import {
  WorkspaceFrame,
  WorkspaceHeader,
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
  const [drawerOrganizationId, setDrawerOrganizationId] = useState("");

  const {
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

  const metrics = getOrganizationMetrics(items);

  function handleClearFilters() {
    setSearch("");
    setDebouncedSearch("");
    setStatus("all");
  }

  function handleSelect(organizationId: string) {
    selectOrganization(organizationId);
    setDrawerOrganizationId(organizationId);
  }

  function renderOrganizationDetail() {
    return (
      <OrganizationDetail
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
      <section className="min-w-0 flex-1 bg-background p-4 md:p-5">
        <div className="mx-auto w-full max-w-[1600px] space-y-5">
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
        </div>
      </section>
      <DetailDrawer
        open={drawerOrganizationId === selectedId && Boolean(selectedId) && Boolean(selectedOrganization)}
        onOpenChange={(open) => {
          if (!open) {
            setDrawerOrganizationId("");
          }
        }}
        title={selectedOrganization?.name ?? "Detalle de organización"}
        description="Detalle operativo y acciones administrativas."
      >
        <div className="h-full overflow-y-auto">{renderOrganizationDetail()}</div>
      </DetailDrawer>
    </WorkspaceFrame>
  );
}
