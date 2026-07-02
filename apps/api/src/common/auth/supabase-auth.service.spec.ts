import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient as createSupabaseClient, type User } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import WebSocket from 'ws';
import type { AppConfig } from '../../config/env.schema';
import { SupabaseAuthService } from './supabase-auth.service';

const getUserMock = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: getUserMock,
    },
  })),
}));

function createConfigService() {
  return {
    get: vi.fn((key: string) => {
      const values: Record<string, string> = {
        SUPABASE_SERVICE_KEY: 'sb_secret_test',
        SUPABASE_URL: 'https://project.supabase.co',
      };

      return values[key];
    }),
  } as unknown as ConfigService<AppConfig, true>;
}

describe('SupabaseAuthService', () => {
  let service: SupabaseAuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SupabaseAuthService(createConfigService());
  });

  it('creates the Supabase client with websocket realtime transport', () => {
    expect(createSupabaseClient).toHaveBeenCalledWith(
      'https://project.supabase.co',
      'sb_secret_test',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
        realtime: {
          transport: WebSocket,
        },
      },
    );
  });

  it('gets the user from the supplied jwt', async () => {
    const user = { id: 'supabase-user-id' } as User;
    getUserMock.mockResolvedValue({ data: { user }, error: null });

    await expect(service.getUserFromJwt('jwt-token')).resolves.toBe(user);

    expect(getUserMock).toHaveBeenCalledWith('jwt-token');
  });

  it('rejects invalid or expired access tokens', async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: { message: 'expired' } });

    await expect(service.getUserFromJwt('jwt-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
