import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { OrganizationMemberRole } from 'db';
import type { AuthenticatedRequest } from './authenticated-request';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<OrganizationMemberRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!roles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const organizationMember = request.organizationMember;

    if (!organizationMember || !roles.includes(organizationMember.role)) {
      throw new ForbiddenException('Organization role is not allowed');
    }

    return true;
  }
}
