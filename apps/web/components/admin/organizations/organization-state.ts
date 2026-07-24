import type {
  AdminOrganization,
  AdminSubscriptionPlan,
  OrganizationMutation,
} from "@/hooks/use-admin-organizations";

export const organizationSearchDebounceMs = 300;

export function getNextSelectedId(
  items: AdminOrganization[],
  currentId: string,
  previousItems: AdminOrganization[] = items,
) {
  if (!items.length) {
    return "";
  }

  if (items.some((item) => item.id === currentId)) {
    return currentId;
  }

  const previousIndex = previousItems.findIndex((item) => item.id === currentId);
  return items[previousIndex]?.id ?? items[0]?.id ?? "";
}

export function getSelectedIdAfterListRefresh(items: AdminOrganization[], currentId: string) {
  return currentId && items.some((item) => item.id === currentId) ? currentId : "";
}

export function createDataRevisionController() {
  let revision = 0;

  return {
    capture() {
      return revision;
    },
    invalidate() {
      revision += 1;
      return revision;
    },
    isCurrent(readRevision: number) {
      return readRevision === revision;
    },
  };
}

export function canSubmitPlan(
  currentPlanCode: string | null | undefined,
  selectedPlan: AdminSubscriptionPlan | undefined,
) {
  return Boolean(
    selectedPlan &&
      selectedPlan.status === "active" &&
      selectedPlan.code !== currentPlanCode,
  );
}

export function isMutationFor(
  mutation: OrganizationMutation | null,
  organizationId: string,
  kind: OrganizationMutation["kind"],
) {
  return mutation?.organizationId === organizationId && mutation.kind === kind;
}

export function createLatestRequestController() {
  let latestId = 0;
  let activeController: AbortController | null = null;

  return {
    begin() {
      activeController?.abort();
      const controller = new AbortController();
      const id = ++latestId;
      activeController = controller;
      return { controller, id };
    },
    isCurrent(id: number) {
      return id === latestId;
    },
    abort() {
      activeController?.abort();
      activeController = null;
      latestId += 1;
    },
  };
}
