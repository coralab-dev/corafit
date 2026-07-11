import { GUARDS_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { UserPlatformRole } from 'db';
import { describe, expect, it, vi } from 'vitest';
import { PlatformAdminGuard } from '../../common/auth/platform-admin.guard';
import { AdminController } from './admin.controller';

describe('AdminController', () => {
  it('adds platform-admin protected organization endpoints', () => {
    const listHandler = Object.getOwnPropertyDescriptor(
      AdminController.prototype,
      'listOrganizations',
    )?.value as () => unknown;
    const getHandler = Object.getOwnPropertyDescriptor(
      AdminController.prototype,
      'getOrganization',
    )?.value as () => unknown;
    const suspendHandler = Object.getOwnPropertyDescriptor(
      AdminController.prototype,
      'suspendOrganization',
    )?.value as () => unknown;
    const reactivateHandler = Object.getOwnPropertyDescriptor(
      AdminController.prototype,
      'reactivateOrganization',
    )?.value as () => unknown;

    expect(Reflect.getMetadata(PATH_METADATA, listHandler)).toBe('organizations');
    expect(Reflect.getMetadata(PATH_METADATA, getHandler)).toBe(
      'organizations/:organizationId',
    );
    expect(Reflect.getMetadata(PATH_METADATA, suspendHandler)).toBe(
      'organizations/:organizationId/suspend',
    );
    expect(Reflect.getMetadata(PATH_METADATA, reactivateHandler)).toBe(
      'organizations/:organizationId/reactivate',
    );
    expect(Reflect.getMetadata(GUARDS_METADATA, listHandler)).toEqual([
      PlatformAdminGuard,
    ]);
    expect(Reflect.getMetadata(GUARDS_METADATA, getHandler)).toEqual([
      PlatformAdminGuard,
    ]);
    expect(Reflect.getMetadata(GUARDS_METADATA, suspendHandler)).toEqual([
      PlatformAdminGuard,
    ]);
    expect(Reflect.getMetadata(GUARDS_METADATA, reactivateHandler)).toEqual([
      PlatformAdminGuard,
    ]);
  });

  it('delegates organization queries to AdminService', async () => {
    const adminService = {
      getOrganization: vi.fn().mockResolvedValue({ id: 'organization-id' }),
      getStatus: vi.fn(),
      listOrganizations: vi.fn().mockResolvedValue([{ id: 'organization-id' }]),
      listSubscriptionPlans: vi.fn().mockResolvedValue([{ code: 'starter' }]),
      reactivateOrganization: vi
        .fn()
        .mockResolvedValue({ id: 'organization-id', status: 'active' }),
      suspendOrganization: vi
        .fn()
        .mockResolvedValue({ id: 'organization-id', status: 'suspended' }),
      updateOrganizationSubscription: vi
        .fn()
        .mockResolvedValue({ id: 'organization-id', plan: { code: 'pro' } }),
    };
    const controller = new AdminController(
      adminService as never,
      {} as never,
      {} as never,
    );

    await expect(
      controller.listOrganizations({ search: 'beta', status: 'active' }),
    ).resolves.toEqual([{ id: 'organization-id' }]);
    await expect(controller.getOrganization('organization-id')).resolves.toEqual({
      id: 'organization-id',
    });
    await expect(controller.suspendOrganization('organization-id')).resolves.toEqual({
      id: 'organization-id',
      status: 'suspended',
    });
    await expect(controller.reactivateOrganization('organization-id')).resolves.toEqual({
      id: 'organization-id',
      status: 'active',
    });
    expect(adminService.listOrganizations).toHaveBeenCalledWith({
      search: 'beta',
      status: 'active',
    });
    expect(adminService.getOrganization).toHaveBeenCalledWith('organization-id');
    expect(adminService.suspendOrganization).toHaveBeenCalledWith('organization-id');
    expect(adminService.reactivateOrganization).toHaveBeenCalledWith(
      'organization-id',
    );
  });

  it('delegates protected subscription updates to AdminService', async () => {
    const adminService = {
      getStatus: vi.fn(),
      updateOrganizationSubscription: vi
        .fn()
        .mockResolvedValue({ id: 'organization-id', plan: { code: 'pro' } }),
    };
    const controller = new AdminController(
      adminService as never,
      {} as never,
      {} as never,
    );
    const handler = Object.getOwnPropertyDescriptor(
      AdminController.prototype,
      'updateOrganizationSubscription',
    )?.value as () => unknown;

    await expect(
      controller.updateOrganizationSubscription('organization-id', {
        planCode: 'pro',
      }),
    ).resolves.toEqual({ id: 'organization-id', plan: { code: 'pro' } });
    expect(adminService.updateOrganizationSubscription).toHaveBeenCalledWith(
      'organization-id',
      { planCode: 'pro' },
    );
    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(
      'organizations/:organizationId/subscription',
    );
    expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toEqual([
      PlatformAdminGuard,
    ]);
  });

  it('delegates protected subscription plan listings to AdminService', async () => {
    const adminService = {
      getStatus: vi.fn(),
      listSubscriptionPlans: vi.fn().mockResolvedValue([{ code: 'starter' }]),
    };
    const controller = new AdminController(
      adminService as never,
      {} as never,
      {} as never,
    );
    const handler = Object.getOwnPropertyDescriptor(
      AdminController.prototype,
      'listSubscriptionPlans',
    )?.value as () => unknown;

    await expect(controller.listSubscriptionPlans()).resolves.toEqual([
      { code: 'starter' },
    ]);
    expect(adminService.listSubscriptionPlans).toHaveBeenCalledWith();
    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(
      'subscription-plans',
    );
    expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toEqual([
      PlatformAdminGuard,
    ]);
  });

  it('keeps admin exercises protected by PlatformAdminGuard', () => {
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        Object.getOwnPropertyDescriptor(
          AdminController.prototype,
          'listGlobalExercises',
        )?.value as () => unknown,
      ),
    ).toEqual([PlatformAdminGuard]);
  });
});

describe('PlatformAdminGuard', () => {
  it('allows admin_saas and rejects normal users', () => {
    const guard = new PlatformAdminGuard();
    const createContext = (platformRole: UserPlatformRole) =>
      ({
        switchToHttp: () => ({
          getRequest: () => ({ user: { platformRole } }),
        }),
      }) as never;

    expect(guard.canActivate(createContext(UserPlatformRole.admin_saas))).toBe(true);
    expect(() => guard.canActivate(createContext(UserPlatformRole.user))).toThrow(
      'Platform admin role is required',
    );
  });
});
