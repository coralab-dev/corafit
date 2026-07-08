import { PrismaPg } from '@prisma/adapter-pg';
import { config } from 'dotenv';
import {
  PrismaClient,
  SubscriptionPlanStatus,
  SubscriptionStatus,
  type Prisma,
} from '../src/generated/prisma/client';

const trialPlanCode = 'trial';
const trialDurationDays = 30;

export type BetaSubscriptionPlanDefinition = {
  code: string;
  name: string;
  description: string;
  priceMonthly: number;
  currency: string;
  clientLimit: number;
  memberLimit: number;
  isPublic: boolean;
  status: SubscriptionPlanStatus;
};

export type BackfillSummary = {
  organizationsScanned: number;
  subscriptionsCreated: number;
  skipped: number;
};

export const betaSubscriptionPlans: BetaSubscriptionPlanDefinition[] = [
  {
    code: 'trial',
    name: 'Trial',
    description: 'Beta trial plan',
    priceMonthly: 0,
    currency: 'MXN',
    clientLimit: 5,
    memberLimit: 1,
    isPublic: true,
    status: SubscriptionPlanStatus.active,
  },
  {
    code: 'starter',
    name: 'Starter',
    description: 'Beta starter plan',
    priceMonthly: 0,
    currency: 'MXN',
    clientLimit: 10,
    memberLimit: 1,
    isPublic: true,
    status: SubscriptionPlanStatus.active,
  },
  {
    code: 'founder',
    name: 'Founder',
    description: 'Manual founder beta plan',
    priceMonthly: 0,
    currency: 'MXN',
    clientLimit: 30,
    memberLimit: 1,
    isPublic: false,
    status: SubscriptionPlanStatus.active,
  },
  {
    code: 'pro',
    name: 'Pro',
    description: 'Beta pro plan',
    priceMonthly: 0,
    currency: 'MXN',
    clientLimit: 30,
    memberLimit: 1,
    isPublic: true,
    status: SubscriptionPlanStatus.active,
  },
  {
    code: 'pro_plus',
    name: 'Pro Plus',
    description: 'Beta pro plus plan',
    priceMonthly: 0,
    currency: 'MXN',
    clientLimit: 60,
    memberLimit: 1,
    isPublic: true,
    status: SubscriptionPlanStatus.active,
  },
  {
    code: 'studio_beta',
    name: 'Studio Beta',
    description: 'Manual beta plan for studios',
    priceMonthly: 0,
    currency: 'MXN',
    clientLimit: 200,
    memberLimit: 20,
    isPublic: false,
    status: SubscriptionPlanStatus.active,
  },
];

export function betaPlanUpsertArgs(
  plan: BetaSubscriptionPlanDefinition,
): Prisma.SubscriptionPlanUpsertArgs {
  return {
    where: { code: plan.code },
    create: {
      code: plan.code,
      name: plan.name,
      description: plan.description,
      priceMonthly: plan.priceMonthly,
      currency: plan.currency,
      clientLimit: plan.clientLimit,
      memberLimit: plan.memberLimit,
      isPublic: plan.isPublic,
      status: plan.status,
    },
    update: {
      name: plan.name,
      priceMonthly: plan.priceMonthly,
      currency: plan.currency,
      clientLimit: plan.clientLimit,
      memberLimit: plan.memberLimit,
      isPublic: plan.isPublic,
      status: plan.status,
    },
  };
}

export function trialPlanUpsertArgs(): Prisma.SubscriptionPlanUpsertArgs {
  const trialPlan = betaSubscriptionPlans.find((plan) => plan.code === trialPlanCode);

  if (!trialPlan) {
    throw new Error('Canonical trial plan is not configured');
  }

  return betaPlanUpsertArgs(trialPlan);
}

export function buildTrialSubscriptionCreateInput(
  organizationId: string,
  subscriptionPlanId: string,
  now: Date,
): Prisma.OrganizationSubscriptionCreateManyInput {
  return {
    organizationId,
    subscriptionPlanId,
    status: SubscriptionStatus.trial,
    startedAt: now,
    renewsAt: addDays(now, trialDurationDays),
  };
}

export function summarizeBackfill(
  organizationsScanned: number,
  subscriptionsCreated: number,
): BackfillSummary {
  return {
    organizationsScanned,
    subscriptionsCreated,
    skipped: organizationsScanned - subscriptionsCreated,
  };
}

export async function backfillBetaSubscriptions(
  prisma: Pick<
    PrismaClient,
    'organization' | 'organizationSubscription' | 'subscriptionPlan'
>,
  now = new Date(),
): Promise<BackfillSummary> {
  const upsertedPlans = await Promise.all(
    betaSubscriptionPlans.map((plan) =>
      prisma.subscriptionPlan.upsert(betaPlanUpsertArgs(plan)),
    ),
  );
  const trialPlan = upsertedPlans.find((plan) => plan.code === trialPlanCode);

  if (!trialPlan) {
    throw new Error('Canonical trial plan was not upserted');
  }

  const organizations = await prisma.organization.findMany({
    select: {
      id: true,
      subscription: { select: { id: true } },
    },
  });
  const missingSubscriptionOrganizations = organizations.filter(
    (organization) => !organization.subscription,
  );
  let subscriptionsCreated = 0;

  if (missingSubscriptionOrganizations.length) {
    const result = await prisma.organizationSubscription.createMany({
      data: missingSubscriptionOrganizations.map((organization) =>
        buildTrialSubscriptionCreateInput(organization.id, trialPlan.id, now),
      ),
      skipDuplicates: true,
    });
    subscriptionsCreated = result.count;
  }

  return summarizeBackfill(
    organizations.length,
    subscriptionsCreated,
  );
}

async function main() {
  config({ path: '../../.env' });
  config();

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to backfill beta subscriptions');
  }

  const adapter = new PrismaPg({ connectionString: databaseUrl });
  const prisma = new PrismaClient({ adapter });

  try {
    const summary = await backfillBetaSubscriptions(prisma);
    console.log('Beta subscription backfill complete');
    console.log(`Organizations scanned: ${summary.organizationsScanned}`);
    console.log(`Subscriptions created: ${summary.subscriptionsCreated}`);
    console.log(`Skipped: ${summary.skipped}`);
  } finally {
    await prisma.$disconnect();
  }
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

if (require.main === module) {
  void main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
