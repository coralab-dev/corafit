import { ForbiddenException } from '@nestjs/common';
import { OrganizationMemberRole, type OrganizationMember } from 'db';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../common/prisma/prisma.service';
import { DashboardService } from './dashboard.service';

type PrismaServiceMock = {
  $transaction: ReturnType<typeof vi.fn>;
  client: {
    count: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  trainingPlan: {
    count: ReturnType<typeof vi.fn>;
  };
  clientAccess: {
    count: ReturnType<typeof vi.fn>;
  };
};

function createMockPrisma(): PrismaServiceMock {
  const mock = {
    $transaction: vi.fn(),
    client: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    trainingPlan: {
      count: vi.fn(),
    },
    clientAccess: {
      count: vi.fn(),
    },
  };

  mock.$transaction.mockImplementation(async (arg: unknown) => {
    if (typeof arg === 'function') {
      const cb = arg as (prisma: PrismaService) => Promise<unknown>;
      return cb(mock);
    }
    return Promise.all(arg as Promise<unknown>[]);
  });

  return mock;
}

const mockMember: OrganizationMember = {
  id: 'member-1',
  organizationId: 'org-1',
  userId: 'user-1',
  role: OrganizationMemberRole.owner,
  status: 'active' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('DashboardService', () => {
  let service: DashboardService;
  let prisma: PrismaServiceMock;

  beforeEach(() => {
    prisma = createMockPrisma();
    service = new DashboardService(prisma as unknown as PrismaService);
  });

  describe('getStatus', () => {
    it('returns ready status', () => {
      const result = service.getStatus();
      expect(result).toEqual({ module: 'dashboard', status: 'ready' });
    });
  });

  describe('getOnboardingStats', () => {
    it('throws Forbidden when member is undefined', async () => {
      await expect(service.getOnboardingStats(undefined)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('returns stats with all counts at zero for empty org', async () => {
      prisma.client.count.mockResolvedValue(0);
      prisma.trainingPlan.count.mockResolvedValue(0);
      prisma.clientAccess.count.mockResolvedValue(0);

      const result = await service.getOnboardingStats(mockMember);

      expect(result).toEqual({
        totalClients: 0,
        totalPlans: 0,
        clientsWithPlan: 0,
        clientsWithoutPlan: 0,
        clientsWithAccess: 0,
        checklist: {
          hasCreatedClient: false,
          hasCreatedOrSelectedPlan: false,
          hasAssignedPlan: false,
          hasGeneratedAccess: false,
          hasPreviewedPortal: false,
        },
      });
    });

    it('returns stats with counts and completed checklist', async () => {
      prisma.client.count.mockResolvedValueOnce(3).mockResolvedValueOnce(2);
      prisma.trainingPlan.count.mockResolvedValue(2);
      prisma.clientAccess.count.mockResolvedValueOnce(1).mockResolvedValueOnce(1);

      const result = await service.getOnboardingStats(mockMember);

      expect(result.totalClients).toBe(3);
      expect(result.totalPlans).toBe(2);
      expect(result.clientsWithPlan).toBe(2);
      expect(result.clientsWithoutPlan).toBe(1);
      expect(result.clientsWithAccess).toBe(1);
      expect(result.checklist.hasCreatedClient).toBe(true);
      expect(result.checklist.hasCreatedOrSelectedPlan).toBe(true);
      expect(result.checklist.hasAssignedPlan).toBe(true);
      expect(result.checklist.hasGeneratedAccess).toBe(true);
      expect(result.checklist.hasPreviewedPortal).toBe(true);
    });

    it('keeps portal preview pending until an access has been used', async () => {
      prisma.client.count.mockResolvedValueOnce(1).mockResolvedValueOnce(1);
      prisma.trainingPlan.count.mockResolvedValue(1);
      prisma.clientAccess.count.mockResolvedValueOnce(1).mockResolvedValueOnce(0);

      const result = await service.getOnboardingStats(mockMember);

      expect(result.checklist.hasGeneratedAccess).toBe(true);
      expect(result.checklist.hasPreviewedPortal).toBe(false);
    });
  });
});
