import { ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  OrganizationMemberRole,
  OrganizationMemberStatus,
  SubscriptionPlanStatus,
  SubscriptionStatus,
  type OrganizationMember,
} from 'db';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../common/prisma/prisma.service';
import { BillingService } from './billing.service';

type PrismaServiceMock = {
  organizationSubscription: {
    findUnique: ReturnType<typeof vi.fn>;
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

describe('BillingService', () => {
  let prismaService: PrismaServiceMock;
  let service: BillingService;

  beforeEach(() => {
    prismaService = {
      organizationSubscription: {
        findUnique: vi.fn().mockResolvedValue({
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
    };
    service = new BillingService(prismaService as unknown as PrismaService);
  });

  it('returns current trial subscription with relevant plan fields', async () => {
    const result = await service.getCurrent(createOrganizationMember());

    expect(prismaService.organizationSubscription.findUnique).toHaveBeenCalledWith({
      where: { organizationId: 'organization-id' },
      include: {
        subscriptionPlan: true,
      },
    });
    expect(result).toMatchObject({
      organizationId: 'organization-id',
      status: SubscriptionStatus.trial,
      plan: {
        code: 'trial',
        clientLimit: 5,
        memberLimit: 1,
      },
    });
  });

  it('rejects requests without organization membership', async () => {
    await expect(service.getCurrent(undefined)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('returns 404 when the organization has no subscription', async () => {
    prismaService.organizationSubscription.findUnique.mockResolvedValue(null);

    await expect(
      service.getCurrent(createOrganizationMember()),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
