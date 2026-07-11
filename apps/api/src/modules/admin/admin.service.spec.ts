import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  ClientOperationalStatus,
  OrganizationStatus,
  OrganizationType,
  SubscriptionPlanStatus,
  SubscriptionStatus,
} from 'db';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../common/prisma/prisma.service';
import { AdminService } from './admin.service';

type PrismaServiceMock = {
  client: {
    count: ReturnType<typeof vi.fn>;
  };
  organization: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  organizationSubscription: {
    upsert: ReturnType<typeof vi.fn>;
  };
  subscriptionPlan: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
  };
};

describe('AdminService', () => {
  let prismaService: PrismaServiceMock;
  let service: AdminService;

  const organization = {
    id: 'organization-id',
    name: 'Beta Coach',
    type: OrganizationType.individual,
    status: OrganizationStatus.active,
    owner: {
      id: 'owner-user-id',
      name: 'Coach Owner',
      email: 'owner@corafit.test',
    },
    subscription: {
      status: SubscriptionStatus.trial,
      subscriptionPlan: {
        id: 'plan-id',
        code: 'trial',
        name: 'Trial',
        clientLimit: 5,
      },
    },
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  beforeEach(() => {
    prismaService = {
      client: {
        count: vi.fn().mockResolvedValue(3),
      },
      organization: {
        findMany: vi.fn().mockResolvedValue([organization]),
        findUnique: vi.fn().mockResolvedValue(organization),
        update: vi.fn().mockResolvedValue({
          ...organization,
          status: OrganizationStatus.suspended,
        }),
      },
      organizationSubscription: {
        upsert: vi.fn().mockResolvedValue({
          id: 'subscription-id',
          organizationId: 'organization-id',
          subscriptionPlanId: 'pro-plan-id',
          status: SubscriptionStatus.active,
          startedAt: new Date('2026-01-01T00:00:00.000Z'),
          renewsAt: new Date('2026-02-01T00:00:00.000Z'),
          cancelledAt: null,
        }),
      },
      subscriptionPlan: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'founder-plan-id',
            code: 'founder',
            name: 'Founder',
            priceMonthly: 0,
            currency: 'MXN',
            clientLimit: 30,
            memberLimit: 1,
            isPublic: false,
            status: SubscriptionPlanStatus.active,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedAt: new Date('2026-01-02T00:00:00.000Z'),
          },
        ]),
        findUnique: vi.fn().mockResolvedValue({
          id: 'pro-plan-id',
          code: 'pro',
          name: 'Pro',
          priceMonthly: 0,
          currency: 'MXN',
          clientLimit: 30,
          memberLimit: 1,
          isPublic: true,
          status: SubscriptionPlanStatus.active,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        }),
      },
    };
    service = new AdminService(prismaService as unknown as PrismaService);
  });

  it('lists organizations with operational fields and active client usage', async () => {
    await expect(service.listOrganizations({ search: 'owner', status: 'active' })).resolves.toEqual([
      {
        id: 'organization-id',
        name: 'Beta Coach',
        type: OrganizationType.individual,
        status: OrganizationStatus.active,
        owner: {
          id: 'owner-user-id',
          name: 'Coach Owner',
          email: 'owner@corafit.test',
        },
        subscription: {
          status: SubscriptionStatus.trial,
        },
        plan: {
          id: 'plan-id',
          code: 'trial',
          name: 'Trial',
          clientLimit: 5,
        },
        clientsUsed: 3,
        createdAt: organization.createdAt,
      },
    ]);

    const includeMatcher = expect.any(Object) as unknown;

    expect(prismaService.organization.findMany).toHaveBeenCalledWith({
      where: {
        status: OrganizationStatus.active,
        OR: [
          { name: { contains: 'owner', mode: 'insensitive' } },
          { owner: { email: { contains: 'owner', mode: 'insensitive' } } },
        ],
      },
      include: includeMatcher,
      orderBy: { createdAt: 'desc' },
    });
    expect(prismaService.client.count).toHaveBeenCalledWith({
      where: {
        organizationId: 'organization-id',
        operationalStatus: { not: ClientOperationalStatus.archived },
      },
    });
  });

  it('gets one organization without exposing client details', async () => {
    await expect(service.getOrganization('organization-id')).resolves.toMatchObject({
      id: 'organization-id',
      owner: {
        email: 'owner@corafit.test',
      },
      clientsUsed: 3,
    });

    const includeMatcher = expect.any(Object) as unknown;

    expect(prismaService.organization.findUnique).toHaveBeenCalledWith({
      where: { id: 'organization-id' },
      include: includeMatcher,
    });
  });

  it('lists all subscription plans for admin operations', async () => {
    await expect(service.listSubscriptionPlans()).resolves.toEqual([
      {
        id: 'founder-plan-id',
        code: 'founder',
        name: 'Founder',
        status: SubscriptionPlanStatus.active,
        isPublic: false,
        betaPrice: 0,
        postBetaPrice: null,
        currency: 'MXN',
        clientLimit: 30,
        memberLimit: 1,
        sortOrder: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      },
    ]);

    expect(prismaService.subscriptionPlan.findMany).toHaveBeenCalledWith({
      select: {
        id: true,
        code: true,
        name: true,
        status: true,
        isPublic: true,
        priceMonthly: true,
        currency: true,
        clientLimit: true,
        memberLimit: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  });

  it('updates an existing organization subscription to an active plan', async () => {
    const updatedOrganization = {
      ...organization,
      subscription: {
        status: SubscriptionStatus.active,
        subscriptionPlan: {
          id: 'pro-plan-id',
          code: 'pro',
          name: 'Pro',
          clientLimit: 30,
        },
      },
    };
    prismaService.organization.findUnique
      .mockResolvedValueOnce(organization)
      .mockResolvedValueOnce(updatedOrganization);

    await expect(
      service.updateOrganizationSubscription('organization-id', { planCode: 'pro' }),
    ).resolves.toMatchObject({
      id: 'organization-id',
      subscription: { status: SubscriptionStatus.active },
      plan: {
        id: 'pro-plan-id',
        code: 'pro',
        name: 'Pro',
        clientLimit: 30,
      },
      clientsUsed: 3,
    });

    expect(prismaService.subscriptionPlan.findUnique).toHaveBeenCalledWith({
      where: { code: 'pro' },
    });
    expect(prismaService.organizationSubscription.upsert).toHaveBeenCalledWith({
      where: { organizationId: 'organization-id' },
      create: {
        organizationId: 'organization-id',
        subscriptionPlanId: 'pro-plan-id',
        status: SubscriptionStatus.active,
        startedAt: expect.any(Date) as Date,
        renewsAt: null,
        cancelledAt: null,
      },
      update: {
        subscriptionPlanId: 'pro-plan-id',
        status: SubscriptionStatus.active,
        cancelledAt: null,
      },
    });
  });

  it('suspends an active organization by updating only its status', async () => {
    const suspendedOrganization = {
      ...organization,
      status: OrganizationStatus.suspended,
    };
    prismaService.organization.findUnique
      .mockResolvedValueOnce(organization)
      .mockResolvedValueOnce(suspendedOrganization);
    prismaService.organization.update.mockResolvedValueOnce(suspendedOrganization);

    await expect(service.suspendOrganization('organization-id')).resolves.toMatchObject({
      id: 'organization-id',
      status: OrganizationStatus.suspended,
      clientsUsed: 3,
    });

    expect(prismaService.organization.update).toHaveBeenCalledWith({
      where: { id: 'organization-id' },
      data: { status: OrganizationStatus.suspended },
    });
  });

  it('keeps suspending an already suspended organization idempotent', async () => {
    const suspendedOrganization = {
      ...organization,
      status: OrganizationStatus.suspended,
    };
    prismaService.organization.findUnique
      .mockResolvedValueOnce(suspendedOrganization)
      .mockResolvedValueOnce(suspendedOrganization);

    await expect(service.suspendOrganization('organization-id')).resolves.toMatchObject({
      id: 'organization-id',
      status: OrganizationStatus.suspended,
    });

    expect(prismaService.organization.update).not.toHaveBeenCalled();
  });

  it('reactivates a suspended organization by updating only its status', async () => {
    const suspendedOrganization = {
      ...organization,
      status: OrganizationStatus.suspended,
    };
    prismaService.organization.findUnique
      .mockResolvedValueOnce(suspendedOrganization)
      .mockResolvedValueOnce(organization);
    prismaService.organization.update.mockResolvedValueOnce(organization);

    await expect(service.reactivateOrganization('organization-id')).resolves.toMatchObject({
      id: 'organization-id',
      status: OrganizationStatus.active,
      clientsUsed: 3,
    });

    expect(prismaService.organization.update).toHaveBeenCalledWith({
      where: { id: 'organization-id' },
      data: { status: OrganizationStatus.active },
    });
  });

  it('keeps reactivating an active organization idempotent', async () => {
    prismaService.organization.findUnique
      .mockResolvedValueOnce(organization)
      .mockResolvedValueOnce(organization);

    await expect(service.reactivateOrganization('organization-id')).resolves.toMatchObject({
      id: 'organization-id',
      status: OrganizationStatus.active,
    });

    expect(prismaService.organization.update).not.toHaveBeenCalled();
  });

  it('returns 404 when changing status for an unknown organization', async () => {
    prismaService.organization.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.suspendOrganization('missing-organization-id'),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prismaService.organization.update).not.toHaveBeenCalled();
  });

  it('rejects status changes for cancelled organizations without writing', async () => {
    prismaService.organization.findUnique.mockResolvedValueOnce({
      ...organization,
      status: OrganizationStatus.cancelled,
    });

    await expect(
      service.reactivateOrganization('organization-id'),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prismaService.organization.update).not.toHaveBeenCalled();
  });

  it('rejects empty plan codes before writing', async () => {
    await expect(
      service.updateOrganizationSubscription('organization-id', { planCode: '   ' }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prismaService.organizationSubscription.upsert).not.toHaveBeenCalled();
  });

  it('returns 404 when changing a subscription for an unknown organization', async () => {
    prismaService.organization.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.updateOrganizationSubscription('missing-organization-id', {
        planCode: 'pro',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prismaService.organizationSubscription.upsert).not.toHaveBeenCalled();
  });

  it('returns a clear error when the requested plan is inactive', async () => {
    prismaService.subscriptionPlan.findUnique.mockResolvedValueOnce({
      id: 'inactive-plan-id',
      code: 'inactive',
      name: 'Inactive',
      priceMonthly: 0,
      currency: 'MXN',
      clientLimit: 1,
      memberLimit: 1,
      isPublic: true,
      status: SubscriptionPlanStatus.inactive,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    });

    await expect(
      service.updateOrganizationSubscription('organization-id', {
        planCode: 'inactive',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prismaService.organizationSubscription.upsert).not.toHaveBeenCalled();
  });

  it('returns 404 when the requested plan does not exist', async () => {
    prismaService.subscriptionPlan.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.updateOrganizationSubscription('organization-id', {
        planCode: 'unknown',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prismaService.organizationSubscription.upsert).not.toHaveBeenCalled();
  });
});
