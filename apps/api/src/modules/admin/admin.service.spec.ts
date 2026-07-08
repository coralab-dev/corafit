import {
  ClientOperationalStatus,
  OrganizationStatus,
  OrganizationType,
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
});
