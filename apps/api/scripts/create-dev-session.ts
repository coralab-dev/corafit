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

dotenv.config({ path: resolve(process.cwd(), '../../.env') });
dotenv.config();

const supabaseUrl = requireEnv('SUPABASE_URL');
const supabaseServiceKey = requireEnv('SUPABASE_SERVICE_KEY');
const supabaseAnonKey = requireEnv('SUPABASE_ANON_KEY');

const devEmail = (process.env.DEV_AUTH_EMAIL ?? 'corafit.dev.coach@gmail.com')
  .trim()
  .toLowerCase();
const devPassword = process.env.DEV_AUTH_PASSWORD ?? 'CoraFitDev123!';
const devName = process.env.DEV_AUTH_NAME?.trim() || 'Coach Demo';
const devOrganizationName =
  process.env.DEV_ORGANIZATION_NAME?.trim() || 'CoraFit Demo';
const devAuthJwt = process.env.DEV_AUTH_JWT?.trim();

type SupabaseUser = {
  id: string;
  email?: string;
};

async function main() {
  const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  const publicSupabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const jwtUserResult = devAuthJwt
    ? await publicSupabase.auth.getUser(devAuthJwt)
    : null;

  let sessionResult = devAuthJwt
    ? null
    : await publicSupabase.auth.signInWithPassword({
        email: devEmail,
        password: devPassword,
      });

  if (jwtUserResult?.error) {
    throw new Error(`DEV_AUTH_JWT is invalid or expired: ${jwtUserResult.error.message}`);
  }

  if (sessionResult?.error) {
    const createResult = await adminSupabase.auth.admin.createUser({
      email: devEmail,
      password: devPassword,
      email_confirm: true,
      user_metadata: {
        name: devName,
      },
    });

    if (createResult.error && !isAlreadyRegistered(createResult.error.message)) {
      const signUpResult = await publicSupabase.auth.signUp({
        email: devEmail,
        password: devPassword,
        options: {
          data: {
            name: devName,
          },
        },
      });

      if (signUpResult.error) {
        throw new Error(
          [
            `Could not create Supabase user: ${createResult.error.message}`,
            `Fallback signUp also failed: ${signUpResult.error.message}`,
            'Check that SUPABASE_SERVICE_KEY is the service_role key, or create the user manually in Supabase Auth.',
          ].join(' '),
        );
      }
    }

    sessionResult = await publicSupabase.auth.signInWithPassword({
      email: devEmail,
      password: devPassword,
    });
  }

  if (!devAuthJwt && (!sessionResult?.data.session || !sessionResult.data.user)) {
    throw new Error(
      [
        `Could not sign in ${devEmail}.`,
        'If this Supabase user already exists, set DEV_AUTH_PASSWORD to its real password or reset it in Supabase.',
        'If email confirmation is enabled, confirm the user in Supabase Auth before running this again.',
        sessionResult?.error ? `Supabase error: ${sessionResult.error.message}` : '',
      ]
        .filter(Boolean)
        .join(' '),
    );
  }

  const supabaseUser: SupabaseUser = devAuthJwt
    ? jwtUserResult.data.user
    : sessionResult.data.user;
  const email = supabaseUser.email?.toLowerCase() ?? devEmail;
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
        name: devName,
        status: UserStatus.active,
      },
      update: {
        email,
        name: devName,
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
          name: devOrganizationName,
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
      apiUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000',
      bearerToken: devAuthJwt ?? sessionResult.data.session.access_token,
      organizationId: organization.id,
    };

    console.log('\nCoraFit dev auth ready\n');
    console.log(`Email: ${devEmail}`);
    if (!devAuthJwt) {
      console.log(`Password: ${devPassword}`);
    }
    console.log(`Organization ID: ${organization.id}`);
    console.log('\nPaste this in the browser console on the web app if you want to skip the Conexion dialog:\n');
    console.log(
      `localStorage.setItem('corafit_api_config', ${JSON.stringify(
        JSON.stringify(configPayload),
      )}); location.reload();`,
    );
    console.log('\nOr use the Conexion dialog with:');
    console.log(`API URL: ${configPayload.apiUrl}`);
    console.log(`Supabase JWT: ${configPayload.bearerToken}`);
    console.log(`Organization ID: ${configPayload.organizationId}\n`);
  } finally {
    await prisma.$disconnect();
  }
}

function requireEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required in .env`);
  }

  return value;
}

function isAlreadyRegistered(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('already') ||
    normalized.includes('registered') ||
    normalized.includes('exists')
  );
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
