import { SetMetadata } from '@nestjs/common';
import type { OrganizationMemberRole } from 'db';

export const ROLES_KEY = 'organizationRoles';

export const Roles = (...roles: OrganizationMemberRole[]) =>
  SetMetadata(ROLES_KEY, roles);
