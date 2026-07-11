import { describe, expect, it } from 'vitest';

import {
  buildDevSessionConfig,
  buildDevSessionOutput,
  validateRemoteMutationAuthorization,
} from './create-dev-session';

const localEnv = {
  SUPABASE_URL: 'http://127.0.0.1:54321',
  SUPABASE_ANON_KEY: 'anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
  DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
  DEV_AUTH_EMAIL: 'local.coach@example.test',
  DEV_AUTH_PASSWORD: 'local-password',
};

describe('create-dev-session config', () => {
  it('requires caller-provided dev credentials without versioned fallbacks', () => {
    expect(() =>
      buildDevSessionConfig({
        SUPABASE_URL: localEnv.SUPABASE_URL,
        SUPABASE_ANON_KEY: localEnv.SUPABASE_ANON_KEY,
        SUPABASE_SERVICE_ROLE_KEY: localEnv.SUPABASE_SERVICE_ROLE_KEY,
        DATABASE_URL: localEnv.DATABASE_URL,
      }),
    ).toThrow('DEV_AUTH_EMAIL is required');
  });

  it('prefers SUPABASE_SERVICE_ROLE_KEY over the legacy service key', () => {
    const config = buildDevSessionConfig({
      ...localEnv,
      SUPABASE_SERVICE_ROLE_KEY: 'preferred-key',
      SUPABASE_SERVICE_KEY: 'legacy-key',
    });

    expect(config.supabaseServiceKey).toBe('preferred-key');
    expect(config.serviceKeySource).toBe('SUPABASE_SERVICE_ROLE_KEY');
  });

  it('classifies local and remote destinations from configured URLs', () => {
    expect(buildDevSessionConfig(localEnv).destination.kind).toBe('local');

    const remoteConfig = buildDevSessionConfig({
      ...localEnv,
      SUPABASE_URL: 'https://project-ref.supabase.co',
      DATABASE_URL:
        'postgresql://postgres:postgres@db.project-ref.supabase.co:5432/postgres',
      DEV_AUTH_ALLOW_REMOTE_MUTATION: 'true',
      DEV_AUTH_EXPECTED_SUPABASE_PROJECT_REF: 'project-ref',
    });

    expect(remoteConfig.destination).toEqual({
      kind: 'remote',
      supabaseProjectRef: 'project-ref',
      databaseHost: 'db.project-ref.supabase.co',
    });
  });

  it('requires explicit opt-in and matching project ref before remote mutation', () => {
    const remoteWithoutOptIn = buildDevSessionConfig({
      ...localEnv,
      SUPABASE_URL: 'https://project-ref.supabase.co',
      DATABASE_URL:
        'postgresql://postgres:postgres@db.project-ref.supabase.co:5432/postgres',
      DEV_AUTH_EXPECTED_SUPABASE_PROJECT_REF: 'project-ref',
    });

    expect(() =>
      validateRemoteMutationAuthorization(remoteWithoutOptIn),
    ).toThrow('DEV_AUTH_ALLOW_REMOTE_MUTATION=true is required');

    const mismatchedRemote = buildDevSessionConfig({
      ...localEnv,
      SUPABASE_URL: 'https://project-ref.supabase.co',
      DATABASE_URL:
        'postgresql://postgres:postgres@db.project-ref.supabase.co:5432/postgres',
      DEV_AUTH_ALLOW_REMOTE_MUTATION: 'true',
      DEV_AUTH_EXPECTED_SUPABASE_PROJECT_REF: 'other-ref',
    });

    expect(() =>
      validateRemoteMutationAuthorization(mismatchedRemote),
    ).toThrow('does not match');
  });

  it('does not print passwords, JWTs, or localStorage commands by default', () => {
    const output = buildDevSessionOutput({
      config: buildDevSessionConfig(localEnv),
      accessToken: 'jwt-secret-value',
      organizationId: 'org_123',
    }).join('\n');

    expect(output).not.toContain(localEnv.DEV_AUTH_PASSWORD);
    expect(output).not.toContain('jwt-secret-value');
    expect(output).not.toContain('localStorage.setItem');
    expect(output).toContain('DEV_AUTH_PRINT_SESSION=true');
  });
});
