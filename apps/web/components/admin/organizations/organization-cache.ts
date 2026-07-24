import type { AdminOrganization, AdminOrganizationFilters } from "./organization-types";

export const organizationCacheTtlMs = 60_000;

export function getOrganizationQueryKey(filters: AdminOrganizationFilters) {
  return JSON.stringify({
    search: filters.search?.trim() ?? "",
    status: filters.status ?? "all",
  });
}

export function isOrganizationCacheFresh(loadedAt: number, now = Date.now()) {
  return now - loadedAt < organizationCacheTtlMs;
}

export function matchesOrganizationFilters(
  organization: AdminOrganization,
  filters: AdminOrganizationFilters,
) {
  const search = filters.search?.trim().toLocaleLowerCase() ?? "";
  const status = filters.status ?? "all";

  if (status !== "all" && organization.status !== status) {
    return false;
  }

  if (!search) {
    return true;
  }

  return [organization.name, organization.owner.email].some((value) =>
    value.toLocaleLowerCase().includes(search),
  );
}
