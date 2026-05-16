import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { ClientAccessStatus, ClientType } from 'db';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../common/prisma/prisma.service';
import { ClientPortalAuthGuard } from './client-portal-auth.guard';
import type { ClientPortalRequest } from './client-portal-request';

type PrismaServiceMock = {
  clientPortalSession: {
    findUnique: ReturnType<typeof vi.fn>;
  };
};

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function createSession(overrides: Record<string, unknown> = {}) {
  return {
    id: 'session-id',
    accessId: 'access-id',
    sessionTokenHash: hashToken('session-token'),
    invalidated: false,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    access: {
      id: 'access-id',
      clientId: 'client-id',
      tokenHash: hashToken('route-token'),
      pinHash: 'pin-hash',
      status: ClientAccessStatus.active,
      failedAttempts: 0,
      lockedUntil: null,
      lastAccessAt: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      client: {
        id: 'client-id',
        organizationId: 'organization-id',
        assignedCoachMemberId: 'member-id',
        name: 'Client One',
        phone: null,
        age: null,
        sex: null,
        clientType: ClientType.online,
        mainGoal: 'Strength',
        heightCm: 170,
        initialWeightKg: 70,
        trainingLevel: null,
        injuriesNotes: null,
        generalNotes: null,
        canRegisterWeight: false,
        operationalStatus: 'active',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    },
    ...overrides,
  };
}

function createExecutionContext(
  request: Partial<ClientPortalRequest>,
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

describe('ClientPortalAuthGuard', () => {
  let prismaService: PrismaServiceMock;
  let guard: ClientPortalAuthGuard;

  beforeEach(() => {
    prismaService = {
      clientPortalSession: {
        findUnique: vi.fn().mockResolvedValue(createSession()),
      },
    };
    guard = new ClientPortalAuthGuard(prismaService as unknown as PrismaService);
  });

  it('rejects requests without a client portal session cookie', async () => {
    const context = createExecutionContext({
      headers: {},
      params: { token: 'route-token' },
    });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('attaches session and access when the cookie is valid', async () => {
    const request: Partial<ClientPortalRequest> = {
      headers: { cookie: 'corafit_client_session=session-token' },
      params: { token: 'route-token' },
    };

    await expect(guard.canActivate(createExecutionContext(request))).resolves.toBe(true);
    expect(prismaService.clientPortalSession.findUnique).toHaveBeenCalledWith({
      where: { sessionTokenHash: hashToken('session-token') },
      include: { access: { include: { client: true } } },
    });
    expect(request.clientPortalSession?.id).toBe('session-id');
    expect(request.clientPortalAccess?.clientId).toBe('client-id');
  });

  it('rejects invalidated sessions', async () => {
    prismaService.clientPortalSession.findUnique.mockResolvedValueOnce(
      createSession({ invalidated: true }),
    );

    await expect(
      guard.canActivate(
        createExecutionContext({
          headers: { cookie: 'corafit_client_session=session-token' },
          params: { token: 'route-token' },
        }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects expired sessions', async () => {
    prismaService.clientPortalSession.findUnique.mockResolvedValueOnce(
      createSession({ expiresAt: new Date('2020-01-01T00:00:00.000Z') }),
    );

    await expect(
      guard.canActivate(
        createExecutionContext({
          headers: { cookie: 'corafit_client_session=session-token' },
          params: { token: 'route-token' },
        }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects sessions for a different portal token', async () => {
    await expect(
      guard.canActivate(
        createExecutionContext({
          headers: { cookie: 'corafit_client_session=session-token' },
          params: { token: 'other-token' },
        }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects sessions when the access is not active', async () => {
    prismaService.clientPortalSession.findUnique.mockResolvedValueOnce(
      createSession({
        access: {
          ...createSession().access,
          status: ClientAccessStatus.disabled,
        },
      }),
    );

    await expect(
      guard.canActivate(
        createExecutionContext({
          headers: { cookie: 'corafit_client_session=session-token' },
          params: { token: 'route-token' },
        }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
