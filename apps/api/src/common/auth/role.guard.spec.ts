import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  OrganizationMemberRole,
  OrganizationMemberStatus,
  type OrganizationMember,
} from 'db';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthenticatedRequest } from './authenticated-request';
import { RoleGuard } from './role.guard';

type ReflectorMock = {
  getAllAndOverride: ReturnType<typeof vi.fn>;
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

function createExecutionContext(
  request: Partial<AuthenticatedRequest>,
): ExecutionContext {
  const handler = () => undefined;
  class TestController {}

  return {
    getHandler: () => handler,
    getClass: () => TestController,
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

describe('RoleGuard', () => {
  let reflector: ReflectorMock;
  let guard: RoleGuard;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: vi.fn().mockReturnValue([OrganizationMemberRole.owner]),
    };
    guard = new RoleGuard(reflector as unknown as Reflector);
  });

  it('allows requests when no role metadata is configured', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(createExecutionContext({}))).toBe(true);
  });

  it('allows members with one of the required roles', () => {
    const context = createExecutionContext({
      organizationMember: createOrganizationMember({
        role: OrganizationMemberRole.owner,
      }),
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('rejects coach members when owner role is required', () => {
    const context = createExecutionContext({
      organizationMember: createOrganizationMember({
        role: OrganizationMemberRole.coach,
      }),
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
