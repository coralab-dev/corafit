export type AuthUser = {
  id: string;
  supabaseUserId: string;
  platformRole: string;
  name: string;
  email: string;
  phone: string | null;
  status: string;
};

export type AuthOrganization = {
  id: string;
  name: string;
  type: string;
  timezone: string;
  status: string;
  ownerUserId: string;
};

export type AuthMember = {
  id: string;
  organizationId: string;
  userId: string;
  role: string;
  status: string;
};

export type AuthSubscription = {
  id: string;
  organizationId: string;
  subscriptionPlanId: string;
  status: string;
  renewsAt: string | null;
  subscriptionPlan: {
    id: string;
    code: string;
    name: string;
    clientLimit: number;
    memberLimit: number;
  };
};

export type AuthProfile = {
  user: AuthUser;
  organization: AuthOrganization;
  member: AuthMember;
  subscription: AuthSubscription;
};
