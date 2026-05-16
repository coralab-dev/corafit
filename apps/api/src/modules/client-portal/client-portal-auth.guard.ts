import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { ClientAccessStatus } from 'db';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { ClientPortalRequest } from './client-portal-request';

const SESSION_COOKIE_NAME = 'corafit_client_session';

@Injectable()
export class ClientPortalAuthGuard implements CanActivate {
  constructor(private readonly prismaService: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<ClientPortalRequest>();
    const routeToken = this.extractRouteToken(request.params.token);
    const sessionToken = this.extractSessionToken(request.headers.cookie);

    const session = await this.prismaService.clientPortalSession.findUnique({
      where: { sessionTokenHash: this.hashToken(sessionToken) },
      include: {
        access: {
          include: { client: true },
        },
      },
    });

    const now = new Date();

    if (
      !session ||
      session.invalidated ||
      session.expiresAt <= now ||
      session.access.status !== ClientAccessStatus.active ||
      session.access.tokenHash !== this.hashToken(routeToken)
    ) {
      throw new UnauthorizedException('Invalid client portal session');
    }

    request.clientPortalSession = session;
    request.clientPortalAccess = session.access;
    return true;
  }

  private extractRouteToken(token: string | string[] | undefined) {
    const value = Array.isArray(token) ? token[0] : token;

    if (!value?.trim()) {
      throw new UnauthorizedException('Invalid client portal session');
    }

    return value.trim();
  }

  private extractSessionToken(cookieHeader: string | undefined) {
    const sessionCookie = cookieHeader
      ?.split(';')
      .map((cookie) => cookie.trim())
      .find((cookie) => cookie.startsWith(`${SESSION_COOKIE_NAME}=`));
    const token = sessionCookie?.slice(SESSION_COOKIE_NAME.length + 1);

    if (!token) {
      throw new UnauthorizedException('Invalid client portal session');
    }

    return decodeURIComponent(token);
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
