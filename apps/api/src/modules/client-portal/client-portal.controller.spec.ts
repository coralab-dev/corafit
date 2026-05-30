import 'reflect-metadata';
import { RequestMethod } from '@nestjs/common';
import { GUARDS_METADATA, METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import type { ConfigService } from '@nestjs/config';
import { describe, expect, it, vi } from 'vitest';
import type { AppConfig } from '../../config/env.schema';
import { ClientPortalAuthGuard } from './client-portal-auth.guard';
import { ClientPortalController } from './client-portal.controller';
import type { ClientPortalRequest } from './client-portal-request';
import type { ClientPortalService } from './client-portal.service';
import type { ClientSessionLogsService } from './client-session-logs.service';

describe('ClientPortalController', () => {
  function createController() {
    const getHome = vi.fn().mockResolvedValue({ state: 'no_plan' });
    const clientPortalService = {
      getHome,
    } as unknown as ClientPortalService;
    const clientSessionLogsService = {} as unknown as ClientSessionLogsService;
    const configService = {
      get: vi.fn().mockReturnValue('test'),
    } as unknown as ConfigService<AppConfig, true>;

    return {
      controller: new ClientPortalController(
        clientPortalService,
        clientSessionLogsService,
        configService,
      ),
      clientPortalService,
      getHome,
    };
  }

  it('protects GET :token/home with ClientPortalAuthGuard', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      ClientPortalController.prototype,
      'getHome',
    );

    const handler = descriptor?.value as object | undefined;

    expect(handler).toBeTypeOf('function');
    expect(Reflect.getMetadata(PATH_METADATA, handler!)).toBe(':token/home');
    expect(Reflect.getMetadata(METHOD_METADATA, handler!)).toBe(RequestMethod.GET);
    expect(Reflect.getMetadata(GUARDS_METADATA, handler!)).toContain(
      ClientPortalAuthGuard,
    );
  });

  it('uses the temporary portal access attached by the guard', async () => {
    const { controller, getHome } = createController();
    const access = {
      id: 'access-id',
      clientId: 'client-id',
      tokenHash: 'token-hash',
      client: { id: 'client-id', name: 'Client One' },
    };
    const request = {
      clientPortalAccess: access,
    } as unknown as ClientPortalRequest;

    await expect(controller.getHome('route-token', request)).resolves.toEqual({ state: 'no_plan' });
    expect(getHome).toHaveBeenCalledWith(access, 'route-token');
  });
});
