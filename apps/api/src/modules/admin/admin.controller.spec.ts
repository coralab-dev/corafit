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

    expect(Reflect.getMetadata(PATH_METADATA, listHandler)).toBe('organizations');
    expect(Reflect.getMetadata(PATH_METADATA, getHandler)).toBe(
      'organizations/:organizationId',
    );
    expect(Reflect.getMetadata(GUARDS_METADATA, listHandler)).toEqual([
      PlatformAdminGuard,
    ]);
    expect(Reflect.getMetadata(GUARDS_METADATA, getHandler)).toEqual([
      PlatformAdminGuard,
    ]);
  });

  it('delegates organization queries to AdminService', async () => {
    const adminService = {
      getOrganization: vi.fn().mockResolvedValue({ id: 'organization-id' }),
      getStatus: vi.fn(),
      listOrganizations: vi.fn().mockResolvedValue([{ id: 'organization-id' }]),
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
    expect(adminService.listOrganizations).toHaveBeenCalledWith({
      search: 'beta',
      status: 'active',
    });
    expect(adminService.getOrganization).toHaveBeenCalledWith('organization-id');
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
