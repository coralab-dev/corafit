import { GUARDS_METADATA } from '@nestjs/common/constants';
import { OrganizationMemberRole, OrganizationMemberStatus, type OrganizationMember } from 'db';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthenticatedRequest } from '../../common/auth/authenticated-request';
import { OrganizationGuard } from '../../common/auth/organization.guard';
import { RoleGuard } from '../../common/auth/role.guard';
import { ROLES_KEY } from '../../common/auth/roles.decorator';
import { BillingController } from './billing.controller';
import type { BillingService } from './billing.service';

type BillingServiceMock = {
  getStatus: ReturnType<typeof vi.fn>;
  getCurrent: ReturnType<typeof vi.fn>;
  listPublicPlans: ReturnType<typeof vi.fn>;
};

function createOrganizationMember(): OrganizationMember {
  return {
    id: 'member-id',
    organizationId: 'organization-id',
    userId: 'user-id',
    role: OrganizationMemberRole.owner,
    status: OrganizationMemberStatus.active,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };
}

describe('BillingController', () => {
  let service: BillingServiceMock;
  let controller: BillingController;

  beforeEach(() => {
    service = {
      getStatus: vi.fn().mockReturnValue({ module: 'billing', status: 'ready' }),
      getCurrent: vi.fn().mockResolvedValue({ organizationId: 'organization-id' }),
      listPublicPlans: vi.fn().mockResolvedValue([{ code: 'starter' }]),
    };
    controller = new BillingController(service as unknown as BillingService);
  });

  it('delegates current billing lookup with the active organization member', async () => {
    const request = {
      organizationMember: createOrganizationMember(),
    } as AuthenticatedRequest;

    await expect(controller.getCurrent(request)).resolves.toEqual({
      organizationId: 'organization-id',
    });
    expect(service.getCurrent).toHaveBeenCalledWith(request.organizationMember);
  });

  it('protects current billing with organization and owner role guards', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      BillingController.prototype,
      'getCurrent',
    );
    const handler = descriptor?.value as unknown;

    expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toEqual([
      OrganizationGuard,
      RoleGuard,
    ]);
    expect(Reflect.getMetadata(ROLES_KEY, handler)).toEqual([
      OrganizationMemberRole.owner,
    ]);
  });

  it('delegates public plan listing for authenticated billing users', async () => {
    await expect(controller.listPlans()).resolves.toEqual([{ code: 'starter' }]);
    expect(service.listPublicPlans).toHaveBeenCalledWith();
  });
});
