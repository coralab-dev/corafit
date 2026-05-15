import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { OrganizationMemberStatus } from 'db';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedRequest } from './authenticated-request';

@Injectable()
export class OrganizationGuard implements CanActivate {
  constructor(private readonly prismaService: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const organizationId = this.extractOrganizationId(
      request.headers['x-organization-id'],
    );

    if (!request.user) {
      throw new ForbiddenException('Authenticated user is required');
    }

    const organizationMember =
      await this.prismaService.organizationMember.findFirst({
        where: {
          organizationId,
          userId: request.user.id,
          status: OrganizationMemberStatus.active,
        },
      });

    if (!organizationMember) {
      throw new ForbiddenException('User is not a member of this organization');
    }

    request.organizationMember = organizationMember;
    return true;
  }

  private extractOrganizationId(header: string | string[] | undefined): string {
    const value = Array.isArray(header) ? header[0] : header;

    if (!value?.trim()) {
      throw new BadRequestException('X-Organization-Id header is required');
    }

    return value.trim();
  }
}
