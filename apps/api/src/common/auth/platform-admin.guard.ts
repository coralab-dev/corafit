import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { UserPlatformRole } from 'db';
import type { AuthenticatedRequest } from './authenticated-request';

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (request.user?.platformRole !== UserPlatformRole.admin_saas) {
      throw new ForbiddenException('Platform admin role is required');
    }

    return true;
  }
}
