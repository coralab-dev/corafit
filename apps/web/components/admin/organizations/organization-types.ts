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
