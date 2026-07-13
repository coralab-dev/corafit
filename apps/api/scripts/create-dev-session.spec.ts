import { describe, expect, it } from 'vitest';

import {
  buildDevSessionConfig,
  buildDevSessionOutput,
  resolveDevAuthEmail,
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
  it('uses the current service role variable', () => {
    const config = buildDevSessionConfig(localEnv);

    expect(config.supabaseServiceKey).toBe('service-role-key');
    expect(config.serviceKeySource).toBe('SUPABASE_SERVICE_ROLE_KEY');
  });

  it('accepts only the legacy service role alias when the current name is absent', () => {
    const config = buildDevSessionConfig({
      ...localEnv,
      SUPABASE_SERVICE_ROLE_KEY: undefined,
      SUPABASE_SERVICE_KEY: 'legacy-service-role-key',
    });

    expect(config.supabaseServiceKey).toBe('legacy-service-role-key');
    expect(config.serviceKeySource).toBe('SUPABASE_SERVICE_KEY');
  });

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
    const localConfig = buildDevSessionConfig(localEnv);

    expect(localConfig.supabaseDestination.kind).toBe('local');
    expect(localConfig.postgresDestination.kind).toBe('local');

    const remoteConfig = buildDevSessionConfig({
      ...localEnv,
      SUPABASE_URL: 'https://project-ref.supabase.co',
      DATABASE_URL:
        'postgresql://postgres:postgres@db.project-ref.supabase.co:5432/postgres',
      DEV_AUTH_ALLOW_REMOTE_MUTATION: 'true',
      DEV_AUTH_EXPECTED_SUPABASE_PROJECT_REF: 'project-ref',
      DEV_AUTH_EXPECTED_POSTGRES_HOST: 'db.project-ref.supabase.co',
    });

    expect(remoteConfig.supabaseDestination).toEqual({
      kind: 'remote',
      projectRef: 'project-ref',
      host: 'project-ref.supabase.co',
    });
    expect(remoteConfig.postgresDestination).toEqual({
      kind: 'remote',
      host: 'db.project-ref.supabase.co',
    });
  });

  it('authorizes remote Supabase and Postgres only when both identities match', () => {
    const config = buildDevSessionConfig({
      ...localEnv,
      SUPABASE_URL: 'https://project-ref.supabase.co',
      DATABASE_URL:
        'postgresql://postgres:postgres@db.project-ref.supabase.co:5432/postgres',
      DEV_AUTH_ALLOW_REMOTE_MUTATION: 'true',
      DEV_AUTH_EXPECTED_SUPABASE_PROJECT_REF: 'project-ref',
      DEV_AUTH_EXPECTED_POSTGRES_HOST: 'db.project-ref.supabase.co',
    });

    expect(() => validateRemoteMutationAuthorization(config)).not.toThrow();
  });

  it('requires explicit opt-in and matching Supabase project before remote mutation', () => {
    const remoteWithoutOptIn = buildDevSessionConfig({
      ...localEnv,
      SUPABASE_URL: 'https://project-ref.supabase.co',
      DATABASE_URL:
        'postgresql://postgres:postgres@db.project-ref.supabase.co:5432/postgres',
      DEV_AUTH_EXPECTED_SUPABASE_PROJECT_REF: 'project-ref',
      DEV_AUTH_EXPECTED_POSTGRES_HOST: 'db.project-ref.supabase.co',
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
      DEV_AUTH_EXPECTED_POSTGRES_HOST: 'db.project-ref.supabase.co',
    });

    expect(() =>
      validateRemoteMutationAuthorization(mismatchedRemote),
    ).toThrow('does not match');
  });

  it('blocks when Supabase matches but Postgres points to another remote host', () => {
    const config = buildDevSessionConfig({
      ...localEnv,
      SUPABASE_URL: 'https://project-ref.supabase.co',
      DATABASE_URL:
        'postgresql://postgres:postgres@db.other-ref.supabase.co:5432/postgres',
      DEV_AUTH_ALLOW_REMOTE_MUTATION: 'true',
      DEV_AUTH_EXPECTED_SUPABASE_PROJECT_REF: 'project-ref',
      DEV_AUTH_EXPECTED_POSTGRES_HOST: 'db.project-ref.supabase.co',
    });

    expect(() => validateRemoteMutationAuthorization(config)).toThrow(
      'DEV_AUTH_EXPECTED_POSTGRES_HOST does not match',
    );
  });

  it('blocks remote Postgres without an expected Postgres identity', () => {
    const config = buildDevSessionConfig({
      ...localEnv,
      SUPABASE_URL: 'https://project-ref.supabase.co',
      DATABASE_URL:
        'postgresql://postgres:postgres@db.project-ref.supabase.co:5432/postgres',
      DEV_AUTH_ALLOW_REMOTE_MUTATION: 'true',
      DEV_AUTH_EXPECTED_SUPABASE_PROJECT_REF: 'project-ref',
    });

    expect(() => validateRemoteMutationAuthorization(config)).toThrow(
      'DEV_AUTH_EXPECTED_POSTGRES_HOST is required',
    );
  });

  it('requires email and password for the password flow', () => {
    const config = buildDevSessionConfig(localEnv);

    expect(config.authFlow).toBe('password');
    expect(config.devEmail).toBe(localEnv.DEV_AUTH_EMAIL);
    expect(config.devPassword).toBe(localEnv.DEV_AUTH_PASSWORD);
  });

  it('allows the JWT flow without a password', () => {
    const config = buildDevSessionConfig({
      ...localEnv,
      DEV_AUTH_EMAIL: undefined,
      DEV_AUTH_PASSWORD: undefined,
      DEV_AUTH_JWT: 'jwt-secret-value',
    });

    expect(config.authFlow).toBe('jwt');
    expect(config.devEmail).toBeNull();
    expect(config.devPassword).toBeNull();
  });

  it('uses the resolved JWT user email and fails safely when it is missing', () => {
    expect(
      resolveDevAuthEmail({
        configuredEmail: null,
        resolvedUserEmail: 'Token.User@Example.Test',
      }),
    ).toBe('token.user@example.test');

    expect(() =>
      resolveDevAuthEmail({
        configuredEmail: null,
        resolvedUserEmail: undefined,
      }),
    ).toThrow('DEV_AUTH_JWT resolved user has no email');
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

  it('prints session details only when explicitly enabled', () => {
    const output = buildDevSessionOutput({
      config: buildDevSessionConfig({
        ...localEnv,
        DEV_AUTH_PRINT_SESSION: 'true',
      }),
      accessToken: 'jwt-secret-value',
      organizationId: 'org_123',
    }).join('\n');

    expect(output).toContain('localStorage.setItem');
    expect(output).toContain('jwt-secret-value');
  });

  it('keeps guard errors free of credentials, tokens, and connection strings', () => {
    const config = buildDevSessionConfig({
      ...localEnv,
      SUPABASE_URL: 'https://project-ref.supabase.co',
      DATABASE_URL:
        'postgresql://postgres:super-secret-password@db.other-ref.supabase.co:5432/postgres',
      DEV_AUTH_ALLOW_REMOTE_MUTATION: 'true',
      DEV_AUTH_EXPECTED_SUPABASE_PROJECT_REF: 'project-ref',
      DEV_AUTH_EXPECTED_POSTGRES_HOST: 'db.project-ref.supabase.co',
      DEV_AUTH_JWT: 'jwt-secret-value',
    });

    let message = '';
    try {
      validateRemoteMutationAuthorization(config);
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }

    expect(message).not.toContain('super-secret-password');
    expect(message).not.toContain('postgresql://');
    expect(message).not.toContain('jwt-secret-value');
  });
});
