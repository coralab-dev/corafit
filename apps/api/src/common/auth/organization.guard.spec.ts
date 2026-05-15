import { BadRequestException, ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import {
  OrganizationMemberRole,
  OrganizationMemberStatus,
  type OrganizationMember,
  UserPlatformRole,
  UserStatus,
} from 'db';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedRequest } from './authenticated-request';
import { OrganizationGuard } from './organization.guard';

type PrismaServiceMock = {
  organizationMember: {
    findFirst: ReturnType<typeof vi.fn>;
  };
};

function createOrganizationMember(
  overrides: Partial<OrganizationMember> = {},
): OrganizationMember {
  return {
    id: 'member-id',
    organizationId: 'organization-id',
    userId: 'user-id',
    role: OrganizationMemberRole.owner,
    status: OrganizationMemberStatus.active,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function createRequest(
  overrides: Partial<AuthenticatedRequest> = {},
): Partial<AuthenticatedRequest> {
  return {
    headers: { 'x-organization-id': 'organization-id' },
    user: {
      id: 'user-id',
      supabaseUserId: 'supabase-user-id',
      platformRole: UserPlatformRole.user,
      name: 'Test Coach',
      email: 'coach@corafit.test',
      phone: null,
      status: UserStatus.active,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    },
    ...overrides,
  };
}

function createExecutionContext(
  request: Partial<AuthenticatedRequest>,
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

describe('OrganizationGuard', () => {
  let prismaService: PrismaServiceMock;
  let guard: OrganizationGuard;

  beforeEach(() => {
    prismaService = {
      organizationMember: {
        findFirst: vi.fn().mockResolvedValue(createOrganizationMember()),
      },
    };
    guard = new OrganizationGuard(prismaService as unknown as PrismaService);
  });

  it('rejects requests without X-Organization-Id', async () => {
    const request = createRequest({ headers: {} });

    await expect(
      guard.canActivate(createExecutionContext(request)),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects users without a membership in the organization', async () => {
    prismaService.organizationMember.findFirst.mockResolvedValue(null);
    const request = createRequest();

    await expect(
      guard.canActivate(createExecutionContext(request)),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('attaches the active organization member to the request', async () => {
    const request = createRequest();

    await expect(
      guard.canActivate(createExecutionContext(request)),
    ).resolves.toBe(true);
    expect(prismaService.organizationMember.findFirst).toHaveBeenCalledWith({
      where: {
        organizationId: 'organization-id',
        userId: 'user-id',
        status: OrganizationMemberStatus.active,
      },
    });
    expect(request.organizationMember).toEqual(createOrganizationMember());
  });
});
