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

export type BackfillSummary = {
  organizationsScanned: number;
  subscriptionsCreated: number;
  skipped: number;
};

export function trialPlanUpsertArgs(): Prisma.SubscriptionPlanUpsertArgs {
  return {
    where: { code: trialPlanCode },
    create: {
      code: trialPlanCode,
      name: 'Trial',
      description: 'Beta trial plan',
      priceMonthly: 0,
      currency: 'MXN',
      clientLimit: 5,
      memberLimit: 1,
      status: SubscriptionPlanStatus.active,
    },
    update: {
      name: 'Trial',
      priceMonthly: 0,
      currency: 'MXN',
      clientLimit: 5,
      memberLimit: 1,
      status: SubscriptionPlanStatus.active,
    },
  };
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
  const trialPlan = await prisma.subscriptionPlan.upsert(trialPlanUpsertArgs());
  const organizations = await prisma.organization.findMany({
    select: {
      id: true,
      subscription: { select: { id: true } },
    },
  });
  const missingSubscriptionOrganizations = organizations.filter(
    (organization) => !organization.subscription,
  );

  if (missingSubscriptionOrganizations.length) {
    await prisma.organizationSubscription.createMany({
      data: missingSubscriptionOrganizations.map((organization) =>
        buildTrialSubscriptionCreateInput(organization.id, trialPlan.id, now),
      ),
      skipDuplicates: true,
    });
  }

  return summarizeBackfill(
    organizations.length,
    missingSubscriptionOrganizations.length,
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
