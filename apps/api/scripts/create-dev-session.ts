import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'node:path';
import {
  OrganizationMemberRole,
  OrganizationMemberStatus,
  OrganizationStatus,
  OrganizationType,
  SubscriptionPlanStatus,
  SubscriptionStatus,
  UserStatus,
  createPrismaClient,
} from 'db';

type Env = Record<string, string | undefined>;

type Destination =
  | {
      kind: 'local';
      supabaseProjectRef: string | null;
      databaseHost: string | null;
    }
  | {
      kind: 'remote';
      supabaseProjectRef: string | null;
      databaseHost: string | null;
    };

type DevSessionConfig = {
  supabaseUrl: string;
  supabaseServiceKey: string;
  serviceKeySource: 'SUPABASE_SERVICE_ROLE_KEY' | 'SUPABASE_SERVICE_KEY';
  supabaseAnonKey: string;
  devEmail: string;
  devPassword: string;
  devName: string;
  devOrganizationName: string;
  devAuthJwt: string | null;
  apiUrl: string;
  printSession: boolean;
  allowRemoteMutation: boolean;
  expectedSupabaseProjectRef: string | null;
  destination: Destination;
};

type SupabaseUser = {
  id: string;
  email?: string;
};

async function main() {
  loadEnv();
  const config = buildDevSessionConfig(process.env);
  validateRemoteMutationAuthorization(config);

  const adminSupabase = createClient(config.supabaseUrl, config.supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  const publicSupabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const jwtUserResult = config.devAuthJwt
    ? await publicSupabase.auth.getUser(config.devAuthJwt)
    : null;

  let sessionResult = config.devAuthJwt
    ? null
    : await publicSupabase.auth.signInWithPassword({
        email: config.devEmail,
        password: config.devPassword,
      });

  if (jwtUserResult?.error) {
    throw new Error(
      `DEV_AUTH_JWT is invalid or expired: ${jwtUserResult.error.message}`,
    );
  }

  if (sessionResult?.error) {
    const createResult = await adminSupabase.auth.admin.createUser({
      email: config.devEmail,
      password: config.devPassword,
      email_confirm: true,
      user_metadata: {
        name: config.devName,
      },
    });

    if (createResult.error && !isAlreadyRegistered(createResult.error.message)) {
      const signUpResult = await publicSupabase.auth.signUp({
        email: config.devEmail,
        password: config.devPassword,
        options: {
          data: {
            name: config.devName,
          },
        },
      });

      if (signUpResult.error) {
        throw new Error(
          [
            `Could not create Supabase user: ${createResult.error.message}`,
            `Fallback signUp also failed: ${signUpResult.error.message}`,
            `Check that ${config.serviceKeySource} is the service_role key, or create the user manually in Supabase Auth.`,
          ].join(' '),
        );
      }
    }

    sessionResult = await publicSupabase.auth.signInWithPassword({
      email: config.devEmail,
      password: config.devPassword,
    });
  }

  if (
    !config.devAuthJwt &&
    (!sessionResult?.data.session || !sessionResult.data.user)
  ) {
    throw new Error(
      [
        `Could not sign in ${config.devEmail}.`,
        'If this Supabase user already exists, set DEV_AUTH_PASSWORD to its real password or reset it in Supabase.',
        'If email confirmation is enabled, confirm the user in Supabase Auth before running this again.',
        sessionResult?.error ? `Supabase error: ${sessionResult.error.message}` : '',
      ]
        .filter(Boolean)
        .join(' '),
    );
  }

  if (config.devAuthJwt && !jwtUserResult?.data.user) {
    throw new Error('DEV_AUTH_JWT did not resolve to a Supabase user.');
  }

  if (!config.devAuthJwt && !sessionResult?.data.user) {
    throw new Error('Supabase sign-in did not resolve to a user.');
  }

  const supabaseUser: SupabaseUser = config.devAuthJwt
    ? jwtUserResult.data.user
    : sessionResult.data.user;
  const email = supabaseUser.email?.toLowerCase() ?? config.devEmail;
  const prisma = createPrismaClient();

  try {
    const trialPlan = await prisma.subscriptionPlan.upsert({
      where: { code: 'trial' },
      create: {
        code: 'trial',
        name: 'Trial',
        description: 'Plan de prueba inicial para coaches nuevos',
        priceMonthly: 0,
        clientLimit: 5,
        memberLimit: 1,
        status: SubscriptionPlanStatus.active,
      },
      update: {
        status: SubscriptionPlanStatus.active,
      },
    });

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ supabaseUserId: supabaseUser.id }, { email }],
      },
    });

    if (existingUser && existingUser.supabaseUserId !== supabaseUser.id) {
      throw new Error(
        `Local user ${existingUser.email} exists with another Supabase id. Use another DEV_AUTH_EMAIL or fix the local row manually.`,
      );
    }

    const user = await prisma.user.upsert({
      where: { supabaseUserId: supabaseUser.id },
      create: {
        supabaseUserId: supabaseUser.id,
        email,
        name: config.devName,
        status: UserStatus.active,
      },
      update: {
        email,
        name: config.devName,
        status: UserStatus.active,
      },
    });

    const organization =
      (await prisma.organization.findFirst({
        where: {
          ownerUserId: user.id,
          status: OrganizationStatus.active,
        },
        orderBy: { createdAt: 'asc' },
      })) ??
      (await prisma.organization.create({
        data: {
          name: config.devOrganizationName,
          type: OrganizationType.individual,
          timezone: 'America/Mexico_City',
          status: OrganizationStatus.active,
          ownerUserId: user.id,
          onboardingCompletedAt: new Date(),
        },
      }));

    await prisma.organizationMember.upsert({
      where: {
        organizationId_userId: {
          organizationId: organization.id,
          userId: user.id,
        },
      },
      create: {
        organizationId: organization.id,
        userId: user.id,
        role: OrganizationMemberRole.owner,
        status: OrganizationMemberStatus.active,
      },
      update: {
        role: OrganizationMemberRole.owner,
        status: OrganizationMemberStatus.active,
      },
    });

    const startedAt = new Date();
    const renewsAt = new Date(startedAt);
    renewsAt.setDate(renewsAt.getDate() + 30);

    await prisma.organizationSubscription.upsert({
      where: { organizationId: organization.id },
      create: {
        organizationId: organization.id,
        subscriptionPlanId: trialPlan.id,
        status: SubscriptionStatus.trial,
        startedAt,
        renewsAt,
      },
      update: {
        subscriptionPlanId: trialPlan.id,
        status: SubscriptionStatus.trial,
      },
    });

    const configPayload = {
      apiUrl: config.apiUrl,
      bearerToken:
        config.devAuthJwt ?? requireSessionAccessToken(sessionResult?.data.session),
      organizationId: organization.id,
    };

    for (const line of buildDevSessionOutput({
      config,
      accessToken: configPayload.bearerToken,
      organizationId: configPayload.organizationId,
    })) {
      console.log(line);
    }
  } finally {
    await prisma.$disconnect();
  }
}

export function buildDevSessionConfig(env: Env): DevSessionConfig {
  const supabaseUrl = requireEnv(env, 'SUPABASE_URL');
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const legacyServiceKey = env.SUPABASE_SERVICE_KEY?.trim();
  const supabaseServiceKey = serviceRoleKey || legacyServiceKey;

  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required in .env');
  }

  const destination = detectDestination(
    supabaseUrl,
    env.DATABASE_URL?.trim() ?? null,
  );

  return {
    supabaseUrl,
    supabaseServiceKey,
    serviceKeySource: serviceRoleKey
      ? 'SUPABASE_SERVICE_ROLE_KEY'
      : 'SUPABASE_SERVICE_KEY',
    supabaseAnonKey: requireEnv(env, 'SUPABASE_ANON_KEY'),
    devEmail: requireEnv(env, 'DEV_AUTH_EMAIL').toLowerCase(),
    devPassword: requireEnv(env, 'DEV_AUTH_PASSWORD'),
    devName: env.DEV_AUTH_NAME?.trim() || 'Coach Demo',
    devOrganizationName: env.DEV_ORGANIZATION_NAME?.trim() || 'CoraFit Demo',
    devAuthJwt: env.DEV_AUTH_JWT?.trim() || null,
    apiUrl: env.NEXT_PUBLIC_API_URL?.trim() || 'http://localhost:4000',
    printSession: env.DEV_AUTH_PRINT_SESSION === 'true',
    allowRemoteMutation: env.DEV_AUTH_ALLOW_REMOTE_MUTATION === 'true',
    expectedSupabaseProjectRef:
      env.DEV_AUTH_EXPECTED_SUPABASE_PROJECT_REF?.trim() || null,
    destination,
  };
}

export function validateRemoteMutationAuthorization(
  config: Pick<
    DevSessionConfig,
    'allowRemoteMutation' | 'expectedSupabaseProjectRef' | 'destination'
  >,
) {
  if (config.destination.kind === 'local') {
    return;
  }

  if (!config.allowRemoteMutation) {
    throw new Error(
      'DEV_AUTH_ALLOW_REMOTE_MUTATION=true is required before dev:auth can mutate a remote Supabase/Postgres destination.',
    );
  }

  if (!config.expectedSupabaseProjectRef) {
    throw new Error(
      'DEV_AUTH_EXPECTED_SUPABASE_PROJECT_REF is required before dev:auth can mutate a remote destination.',
    );
  }

  if (
    config.destination.supabaseProjectRef !== config.expectedSupabaseProjectRef
  ) {
    throw new Error(
      `DEV_AUTH_EXPECTED_SUPABASE_PROJECT_REF does not match configured Supabase destination.`,
    );
  }
}

function requireSessionAccessToken(session: { access_token?: string } | null | undefined) {
  if (!session?.access_token) {
    throw new Error('Supabase sign-in did not return an access token.');
  }

  return session.access_token;
}

export function buildDevSessionOutput(input: {
  config: Pick<DevSessionConfig, 'devEmail' | 'apiUrl' | 'printSession'>;
  accessToken: string;
  organizationId: string;
}) {
  const lines = [
    '',
    'CoraFit dev auth ready',
    '',
    `Email: ${input.config.devEmail}`,
    `Organization ID: ${input.organizationId}`,
  ];

  if (!input.config.printSession) {
    lines.push(
      '',
      'Sensitive session output is hidden by default.',
      'Set DEV_AUTH_PRINT_SESSION=true for a one-time console print of the local browser session details.',
      '',
    );
    return lines;
  }

  const configPayload = {
    apiUrl: input.config.apiUrl,
    bearerToken: input.accessToken,
    organizationId: input.organizationId,
  };

  lines.push(
    '',
    'Paste this in the browser console on the web app if you want to skip the Conexion dialog:',
    '',
    `localStorage.setItem('corafit_api_config', ${JSON.stringify(
      JSON.stringify(configPayload),
    )}); location.reload();`,
    '',
    'Or use the Conexion dialog with:',
    `API URL: ${configPayload.apiUrl}`,
    `Supabase JWT: ${configPayload.bearerToken}`,
    `Organization ID: ${configPayload.organizationId}`,
    '',
  );

  return lines;
}

function loadEnv() {
  dotenv.config({ path: resolve(process.cwd(), '../../.env'), quiet: true });
  dotenv.config({ quiet: true });
}

function requireEnv(env: Env, name: string) {
  const value = env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required in .env`);
  }

  return value;
}

function detectDestination(
  supabaseUrl: string,
  databaseUrl: string | null,
): Destination {
  const supabaseHost = parseHost(supabaseUrl);
  const databaseHost = databaseUrl ? parseHost(databaseUrl) : null;
  const supabaseProjectRef = getSupabaseProjectRef(supabaseHost);
  const hosts = [supabaseHost, databaseHost].filter(
    (host): host is string => Boolean(host),
  );
  const isLocal = hosts.every(isLocalHost);

  return {
    kind: isLocal ? 'local' : 'remote',
    supabaseProjectRef,
    databaseHost,
  };
}

function parseHost(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    throw new Error('Could not identify configured destination host.');
  }
}

function getSupabaseProjectRef(host: string) {
  if (host.startsWith('db.') && host.endsWith('.supabase.co')) {
    return host.split('.')[1] ?? null;
  }

  if (host.endsWith('.supabase.co')) {
    return host.split('.')[0] ?? null;
  }

  return null;
}

function isLocalHost(host: string) {
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1' ||
    host.endsWith('.localhost')
  );
}

function isAlreadyRegistered(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('already') ||
    normalized.includes('registered') ||
    normalized.includes('exists')
  );
}

if (require.main === module) {
  void main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
