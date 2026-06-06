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
import type { ProgressService } from '../progress/progress.service';

describe('ClientPortalController', () => {
  function createController(nodeEnv = 'test') {
    const getHome = vi.fn().mockResolvedValue({ state: 'no_plan' });
    const verifyPin = vi.fn();
    const clientPortalService = {
      getHome,
      verifyPin,
    } as unknown as ClientPortalService;
    const clientSessionLogsService = {} as unknown as ClientSessionLogsService;
    const progressService = {} as unknown as ProgressService;
    const configService = {
      get: vi.fn().mockReturnValue(nodeEnv),
    } as unknown as ConfigService<AppConfig, true>;

    return {
      controller: new ClientPortalController(
        clientPortalService,
        clientSessionLogsService,
        progressService,
        configService,
      ),
      clientPortalService,
      getHome,
      verifyPin,
      configService,
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

  it('sets a cross-site secure session cookie in production after valid PIN', async () => {
    const { controller, verifyPin } = createController('production');
    verifyPin.mockResolvedValue({
      success: true,
      remainingAttempts: 5,
      locked: false,
      sessionToken: 'session-token',
    });
    const setHeader = vi.fn();

    await controller.verifyPin(
      'route-token',
      { pin: '123456' },
      { setHeader } as never,
    );

    expect(verifyPin).toHaveBeenCalledWith('route-token', { pin: '123456' });
    const cookie = setHeader.mock.calls[0]?.[1] as string;
    expect(cookie).toContain('Secure;');
    expect(cookie).toContain('SameSite=None;');
  });

  it('sets a lax session cookie outside production', async () => {
    const { controller, verifyPin } = createController('development');
    verifyPin.mockResolvedValue({
      success: true,
      remainingAttempts: 5,
      locked: false,
      sessionToken: 'session-token',
    });
    const setHeader = vi.fn();

    await controller.verifyPin(
      'route-token',
      { pin: '123456' },
      { setHeader } as never,
    );

    expect(setHeader).toHaveBeenCalledWith(
      'Set-Cookie',
      expect.stringContaining('SameSite=Lax;'),
    );
  });
});
