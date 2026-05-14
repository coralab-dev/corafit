import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { UserRole, UserStatus, type User } from 'db';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedRequest } from './authenticated-request';
import { SupabaseAuthService } from './supabase-auth.service';
import { SupabaseJwtGuard } from './supabase-jwt.guard';

type ReflectorMock = {
  getAllAndOverride: ReturnType<typeof vi.fn>;
};

type SupabaseAuthServiceMock = {
  getUserFromJwt: ReturnType<typeof vi.fn>;
};

type PrismaServiceMock = {
  user: {
    findUnique: ReturnType<typeof vi.fn>;
  };
};

function createLocalUser(overrides: Partial<User> = {}): User {
  return {
    id: 'local-user-id',
    supabaseUserId: 'supabase-user-id',
    email: 'coach@corafit.test',
    role: UserRole.coach,
    status: UserStatus.active,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function createSupabaseUser(overrides: Partial<SupabaseUser> = {}): SupabaseUser {
  return {
    id: 'supabase-user-id',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2026-01-01T00:00:00.000Z',
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

describe('SupabaseJwtGuard', () => {
  let reflector: ReflectorMock;
  let supabaseAuthService: SupabaseAuthServiceMock;
  let prismaService: PrismaServiceMock;
  let guard: SupabaseJwtGuard;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(false),
    };
    supabaseAuthService = {
      getUserFromJwt: vi.fn().mockResolvedValue(createSupabaseUser()),
    };
    prismaService = {
      user: {
        findUnique: vi.fn().mockResolvedValue(createLocalUser()),
      },
    };
    guard = new SupabaseJwtGuard(
      reflector as unknown as Reflector,
      supabaseAuthService as unknown as SupabaseAuthService,
      prismaService as unknown as PrismaService,
    );
  });

  it('allows public handlers without reading the token', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const context = createExecutionContext({ headers: {} });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(supabaseAuthService.getUserFromJwt).not.toHaveBeenCalled();
    expect(prismaService.user.findUnique).not.toHaveBeenCalled();
  });

  it('rejects requests without Authorization', async () => {
    const context = createExecutionContext({ headers: {} });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects invalid bearer tokens from Supabase Auth', async () => {
    supabaseAuthService.getUserFromJwt.mockRejectedValue(
      new UnauthorizedException('Invalid or expired access token'),
    );
    const context = createExecutionContext({
      headers: { authorization: 'Bearer invalid-token' },
    });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects valid Supabase users without a local user', async () => {
    prismaService.user.findUnique.mockResolvedValue(null);
    const context = createExecutionContext({
      headers: { authorization: 'Bearer valid-token' },
    });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rejects inactive local users', async () => {
    prismaService.user.findUnique.mockResolvedValue(
      createLocalUser({ status: UserStatus.inactive }),
    );
    const context = createExecutionContext({
      headers: { authorization: 'Bearer valid-token' },
    });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('allows active local users and attaches request.user', async () => {
    const request: Partial<AuthenticatedRequest> = {
      headers: { authorization: 'Bearer valid-token' },
    };
    const context = createExecutionContext(request);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(supabaseAuthService.getUserFromJwt).toHaveBeenCalledWith('valid-token');
    expect(prismaService.user.findUnique).toHaveBeenCalledWith({
      where: { supabaseUserId: 'supabase-user-id' },
    });
    expect(request.user).toEqual(createLocalUser());
  });
});
