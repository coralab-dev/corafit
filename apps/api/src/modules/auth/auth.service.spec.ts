import { ConflictException } from '@nestjs/common';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import {
  OrganizationMemberRole,
  OrganizationMemberStatus,
  OrganizationStatus,
  OrganizationType,
  UserPlatformRole,
  UserStatus,
} from 'db';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseAuthService } from '../../common/auth/supabase-auth.service';
import type { PrismaService } from '../../common/prisma/prisma.service';
import { AuthService } from './auth.service';

type SupabaseAuthServiceMock = {
  getUserFromJwt: ReturnType<typeof vi.fn>;
};

type PrismaServiceMock = {
  user: {
    findUnique: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
};

type TransactionMock = {
  user: {
    create: ReturnType<typeof vi.fn>;
  };
  organization: {
    create: ReturnType<typeof vi.fn>;
  };
  organizationMember: {
    create: ReturnType<typeof vi.fn>;
  };
};

function createSupabaseUser(overrides: Partial<SupabaseUser> = {}): SupabaseUser {
  return {
    id: 'supabase-user-id',
    email: 'coach@corafit.test',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('AuthService', () => {
  let supabaseAuthService: SupabaseAuthServiceMock;
  let prismaService: PrismaServiceMock;
  let service: AuthService;

  beforeEach(() => {
    supabaseAuthService = {
      getUserFromJwt: vi.fn().mockResolvedValue(createSupabaseUser()),
    };
    const transaction: TransactionMock = {
      user: {
        create: vi.fn().mockResolvedValue({
          id: 'user-id',
          supabaseUserId: 'supabase-user-id',
          email: 'coach@corafit.test',
          name: 'Test Coach',
          phone: null,
          platformRole: UserPlatformRole.user,
          status: UserStatus.active,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        }),
      },
      organization: {
        create: vi.fn().mockResolvedValue({
          id: 'organization-id',
          name: 'Test Coach',
          type: OrganizationType.individual,
          timezone: 'America/Mexico_City',
          status: OrganizationStatus.active,
          ownerUserId: 'user-id',
          onboardingCompletedAt: null,
          clientPortalPreviewSeenAt: null,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        }),
      },
      organizationMember: {
        create: vi.fn().mockResolvedValue({
          id: 'member-id',
          organizationId: 'organization-id',
          userId: 'user-id',
          role: OrganizationMemberRole.owner,
          status: OrganizationMemberStatus.active,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        }),
      },
    };
    prismaService = {
      user: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
      $transaction: vi.fn(
        (callback: (transaction: TransactionMock) => Promise<unknown>) =>
          callback(transaction),
      ),
    };
    service = new AuthService(
      prismaService as unknown as PrismaService,
      supabaseAuthService as unknown as SupabaseAuthService,
    );
  });

  it('creates a user, individual organization, and owner member atomically', async () => {
    const result = await service.registerProfile(
      { name: ' Test Coach ' },
      'Bearer valid-token',
    );

    expect(supabaseAuthService.getUserFromJwt).toHaveBeenCalledWith('valid-token');
    expect(prismaService.user.findUnique).toHaveBeenCalledWith({
      where: { supabaseUserId: 'supabase-user-id' },
    });
    expect(prismaService.$transaction).toHaveBeenCalledOnce();
    expect(result.organization).toMatchObject({
      name: 'Test Coach',
      type: OrganizationType.individual,
      timezone: 'America/Mexico_City',
      status: OrganizationStatus.active,
      ownerUserId: 'user-id',
    });
    expect(result.member).toMatchObject({
      role: OrganizationMemberRole.owner,
      status: OrganizationMemberStatus.active,
    });
  });

  it('rejects Supabase users that already have a local profile', async () => {
    prismaService.user.findUnique.mockResolvedValue({ id: 'existing-user-id' });

    await expect(
      service.registerProfile({ name: 'Test Coach' }, 'Bearer valid-token'),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
