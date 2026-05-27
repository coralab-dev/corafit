import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import {
  OrganizationMemberRole,
  OrganizationMemberStatus,
  OrganizationStatus,
  OrganizationType,
  SubscriptionPlanStatus,
  SubscriptionStatus,
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
  organizationMember: {
    findFirst: ReturnType<typeof vi.fn>;
  };
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
  organizationSubscription: {
    create: ReturnType<typeof vi.fn>;
  };
  subscriptionPlan: {
    upsert: ReturnType<typeof vi.fn>;
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
  let transaction: TransactionMock;
  let service: AuthService;

  beforeEach(() => {
    supabaseAuthService = {
      getUserFromJwt: vi.fn().mockResolvedValue(createSupabaseUser()),
    };
    transaction = {
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
      organizationSubscription: {
        create: vi.fn().mockResolvedValue({
          id: 'subscription-id',
          organizationId: 'organization-id',
          subscriptionPlanId: 'trial-plan-id',
          status: SubscriptionStatus.trial,
          startedAt: new Date('2026-01-01T00:00:00.000Z'),
          renewsAt: new Date('2026-01-31T00:00:00.000Z'),
          cancelledAt: null,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          subscriptionPlan: {
            id: 'trial-plan-id',
            code: 'trial',
            name: 'Trial',
            description: 'Plan de prueba inicial para coaches nuevos',
            priceMonthly: 0,
            currency: 'MXN',
            clientLimit: 5,
            memberLimit: 1,
            features: null,
            isPublic: true,
            status: SubscriptionPlanStatus.active,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          },
        }),
      },
      subscriptionPlan: {
        upsert: vi.fn().mockResolvedValue({
          id: 'trial-plan-id',
          code: 'trial',
          name: 'Trial',
          description: 'Plan de prueba inicial para coaches nuevos',
          priceMonthly: 0,
          currency: 'MXN',
          clientLimit: 5,
          memberLimit: 1,
          features: null,
          isPublic: true,
          status: SubscriptionPlanStatus.active,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        }),
      },
    };
    prismaService = {
      organizationMember: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'member-id',
          organizationId: 'organization-id',
          userId: 'user-id',
          role: OrganizationMemberRole.owner,
          status: OrganizationMemberStatus.active,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          organization: {
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
            subscription: {
              id: 'subscription-id',
              organizationId: 'organization-id',
              subscriptionPlanId: 'trial-plan-id',
              status: SubscriptionStatus.trial,
              startedAt: new Date('2026-01-01T00:00:00.000Z'),
              renewsAt: new Date('2026-01-31T00:00:00.000Z'),
              cancelledAt: null,
              createdAt: new Date('2026-01-01T00:00:00.000Z'),
              updatedAt: new Date('2026-01-01T00:00:00.000Z'),
              subscriptionPlan: {
                id: 'trial-plan-id',
                code: 'trial',
                name: 'Trial',
                description: 'Plan de prueba inicial para coaches nuevos',
                priceMonthly: 0,
                currency: 'MXN',
                clientLimit: 5,
                memberLimit: 1,
                features: null,
                isPublic: true,
                status: SubscriptionPlanStatus.active,
                createdAt: new Date('2026-01-01T00:00:00.000Z'),
                updatedAt: new Date('2026-01-01T00:00:00.000Z'),
              },
            },
          },
        }),
      },
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
      {
        name: ' Test Coach ',
        phone: ' 555-0100 ',
        termsAccepted: true,
        termsVersion: '1.0',
        privacyVersion: '1.0',
      },
      'Bearer valid-token',
    );

    expect(supabaseAuthService.getUserFromJwt).toHaveBeenCalledWith('valid-token');
    expect(prismaService.user.findUnique).toHaveBeenCalledWith({
      where: { supabaseUserId: 'supabase-user-id' },
    });
    expect(prismaService.$transaction).toHaveBeenCalledOnce();
    const upsertPlanInput = transaction.subscriptionPlan.upsert.mock.calls[0]?.[0] as {
      create: {
        clientLimit: number;
        code: string;
        memberLimit: number;
        status: SubscriptionPlanStatus;
      };
      update: { status: SubscriptionPlanStatus };
      where: { code: string };
    };
    expect(upsertPlanInput.where.code).toBe('trial');
    expect(upsertPlanInput.create.code).toBe('trial');
    expect(upsertPlanInput.create.clientLimit).toBe(5);
    expect(upsertPlanInput.create.memberLimit).toBe(1);
    expect(upsertPlanInput.create.status).toBe(SubscriptionPlanStatus.active);
    expect(upsertPlanInput.update.status).toBe(SubscriptionPlanStatus.active);
    const createUserInput = transaction.user.create.mock.calls[0]?.[0] as {
      data: {
        acceptedPrivacyAt: Date;
        acceptedPrivacyVersion: string;
        acceptedTermsAt: Date;
        acceptedTermsVersion: string;
        name: string;
        phone: string | null;
      };
    };
    expect(createUserInput.data.name).toBe('Test Coach');
    expect(createUserInput.data.phone).toBe('555-0100');
    expect(createUserInput.data.acceptedTermsAt).toBeInstanceOf(Date);
    expect(createUserInput.data.acceptedTermsVersion).toBe('1.0');
    expect(createUserInput.data.acceptedPrivacyAt).toBeInstanceOf(Date);
    expect(createUserInput.data.acceptedPrivacyVersion).toBe('1.0');
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
    expect(result.subscription).toMatchObject({
      organizationId: 'organization-id',
      subscriptionPlanId: 'trial-plan-id',
      status: SubscriptionStatus.trial,
      subscriptionPlan: {
        code: 'trial',
        clientLimit: 5,
        memberLimit: 1,
      },
    });
  });

  it('rejects profile registration without legal acceptance', async () => {
    await expect(
      service.registerProfile(
        { name: 'Test Coach', termsAccepted: false },
        'Bearer valid-token',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(supabaseAuthService.getUserFromJwt).not.toHaveBeenCalled();
    expect(prismaService.user.findUnique).not.toHaveBeenCalled();
  });

  it('rejects Supabase users that already have a local profile', async () => {
    prismaService.user.findUnique.mockResolvedValue({ id: 'existing-user-id' });

    await expect(
      service.registerProfile(
        {
          name: 'Test Coach',
          termsAccepted: true,
          termsVersion: '1.0',
          privacyVersion: '1.0',
        },
        'Bearer valid-token',
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('returns the internal profile with organization, member, and subscription', async () => {
    prismaService.user.findUnique.mockResolvedValue({
      id: 'user-id',
      supabaseUserId: 'supabase-user-id',
      email: 'coach@corafit.test',
      name: 'Test Coach',
      phone: '555-0100',
      platformRole: UserPlatformRole.user,
      status: UserStatus.active,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    await expect(service.getMe('Bearer valid-token')).resolves.toMatchObject({
      user: {
        id: 'user-id',
        email: 'coach@corafit.test',
        name: 'Test Coach',
        phone: '555-0100',
      },
      organization: {
        id: 'organization-id',
        name: 'Test Coach',
      },
      member: {
        id: 'member-id',
        role: OrganizationMemberRole.owner,
      },
      subscription: {
        id: 'subscription-id',
        status: SubscriptionStatus.trial,
        subscriptionPlan: {
          code: 'trial',
        },
      },
    });
  });

  it('throws PROFILE_NOT_FOUND when no internal profile is available', async () => {
    await expect(service.getMe('Bearer valid-token')).rejects.toMatchObject({
      response: {
        error: 'PROFILE_NOT_FOUND',
      },
    });

    prismaService.user.findUnique.mockResolvedValue({
      id: 'user-id',
      supabaseUserId: 'supabase-user-id',
      email: 'coach@corafit.test',
      name: 'Test Coach',
      phone: null,
      platformRole: UserPlatformRole.user,
      status: UserStatus.active,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    prismaService.organizationMember.findFirst.mockResolvedValue(null);

    await expect(
      service.getMe('Bearer valid-token'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
