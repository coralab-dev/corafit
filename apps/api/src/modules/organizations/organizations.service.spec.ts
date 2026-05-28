import { BadRequestException } from '@nestjs/common';
import {
  OrganizationMemberRole,
  OrganizationMemberStatus,
  OrganizationStatus,
  OrganizationType,
  type OrganizationMember,
} from 'db';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../common/prisma/prisma.service';
import { OrganizationsService } from './organizations.service';

type PrismaServiceMock = {
  organization: {
    update: ReturnType<typeof vi.fn>;
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

describe('OrganizationsService', () => {
  let prismaService: PrismaServiceMock;
  let service: OrganizationsService;

  beforeEach(() => {
    prismaService = {
      organization: {
        update: vi.fn().mockResolvedValue({
          id: 'organization-id',
          name: 'Updated Org',
          type: OrganizationType.individual,
          timezone: 'America/Mexico_City',
          status: OrganizationStatus.active,
          ownerUserId: 'user-id',
          onboardingCompletedAt: null,
          clientPortalPreviewSeenAt: null,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-15T00:00:00.000Z'),
        }),
      },
    };
    service = new OrganizationsService(
      prismaService as unknown as PrismaService,
    );
  });

  describe('updateCurrent', () => {
    it('allows owner to update organization name', async () => {
      const member = createOrganizationMember();
      const result = await service.updateCurrent(member, { name: ' Updated Org ' });

      expect(prismaService.organization.update).toHaveBeenCalledWith({
        where: { id: 'organization-id' },
        data: { name: 'Updated Org' },
      });
      expect(result).toMatchObject({ name: 'Updated Org' });
    });

    it('trims the organization name', async () => {
      const member = createOrganizationMember();
      await service.updateCurrent(member, { name: '  My Gym  ' });

      expect(prismaService.organization.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { name: 'My Gym' },
        }),
      );
    });

    it('rejects name shorter than 2 characters', async () => {
      const member = createOrganizationMember();
      await expect(
        service.updateCurrent(member, { name: 'A' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects name longer than 100 characters', async () => {
      const member = createOrganizationMember();
      await expect(
        service.updateCurrent(member, { name: 'A'.repeat(101) }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects empty name', async () => {
      const member = createOrganizationMember();
      await expect(
        service.updateCurrent(member, { name: '' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('does not update timezone, type, or status', async () => {
      const member = createOrganizationMember();
      await service.updateCurrent(member, { name: 'New Name' });

      expect(prismaService.organization.update).toHaveBeenCalledWith({
        where: { id: 'organization-id' },
        data: { name: 'New Name' },
      });
    });
  });
});
