import type { Request } from 'express';
import type { OrganizationMember, User } from 'db';

export type AuthenticatedRequest = Request & {
  organizationMember?: OrganizationMember;
  user?: User;
};
