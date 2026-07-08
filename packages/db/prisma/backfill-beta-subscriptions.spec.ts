import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  backfillBetaSubscriptions,
  betaPlanUpsertArgs,
  betaSubscriptionPlans,
  buildTrialSubscriptionCreateInput,
  summarizeBackfill,
  trialPlanUpsertArgs,
} from './backfill-beta-subscriptions';

void describe('backfill beta subscriptions helpers', () => {
  void it('defines the six beta subscription plans with beta prices', () => {
    assert.deepEqual(
      betaSubscriptionPlans.map((plan) => ({
        code: plan.code,
        name: plan.name,
        priceMonthly: plan.priceMonthly,
        clientLimit: plan.clientLimit,
        memberLimit: plan.memberLimit,
        isPublic: plan.isPublic,
        status: plan.status,
      })),
      [
        {
          code: 'trial',
          name: 'Trial',
          priceMonthly: 0,
          clientLimit: 5,
          memberLimit: 1,
          isPublic: true,
          status: 'active',
        },
        {
          code: 'starter',
          name: 'Starter',
          priceMonthly: 0,
          clientLimit: 10,
          memberLimit: 1,
          isPublic: true,
          status: 'active',
        },
        {
          code: 'founder',
          name: 'Founder',
          priceMonthly: 0,
          clientLimit: 30,
          memberLimit: 1,
          isPublic: false,
          status: 'active',
        },
        {
          code: 'pro',
          name: 'Pro',
          priceMonthly: 0,
          clientLimit: 30,
          memberLimit: 1,
          isPublic: true,
          status: 'active',
        },
        {
          code: 'pro_plus',
          name: 'Pro Plus',
          priceMonthly: 0,
          clientLimit: 60,
          memberLimit: 1,
          isPublic: true,
          status: 'active',
        },
        {
          code: 'studio_beta',
          name: 'Studio Beta',
          priceMonthly: 0,
          clientLimit: 200,
          memberLimit: 20,
          isPublic: false,
          status: 'active',
        },
      ],
    );
  });

  void it('builds canonical upsert args for every beta plan', () => {
    assert.deepEqual(betaPlanUpsertArgs(betaSubscriptionPlans[0]), {
      where: { code: 'trial' },
      create: {
        code: 'trial',
        name: 'Trial',
        description: 'Beta trial plan',
        priceMonthly: 0,
        currency: 'MXN',
        clientLimit: 5,
        memberLimit: 1,
        isPublic: true,
        status: 'active',
      },
      update: {
        name: 'Trial',
        priceMonthly: 0,
        currency: 'MXN',
        clientLimit: 5,
        memberLimit: 1,
        isPublic: true,
        status: 'active',
      },
    });
  });

  void it('keeps the trial upsert helper aligned to the canonical trial plan', () => {
    assert.deepEqual(trialPlanUpsertArgs(), betaPlanUpsertArgs(betaSubscriptionPlans[0]));
  });

  void it('creates trial subscription input with a 30 day renewal date', () => {
    const now = new Date('2026-06-29T00:00:00.000Z');

    assert.deepEqual(buildTrialSubscriptionCreateInput('org-id', 'plan-id', now), {
      organizationId: 'org-id',
      subscriptionPlanId: 'plan-id',
      status: 'trial',
      startedAt: now,
      renewsAt: new Date('2026-07-29T00:00:00.000Z'),
    });
  });

  void it('summarizes scanned, created, and skipped organizations', () => {
    assert.deepEqual(summarizeBackfill(7, 3), {
      organizationsScanned: 7,
      subscriptionsCreated: 3,
      skipped: 4,
    });
  });

  void it('uses createMany count for the created summary', async () => {
    const upsertedCodes: string[] = [];
    const prisma = {
      subscriptionPlan: {
        upsert: (args: { where: { code: string } }) => {
          upsertedCodes.push(args.where.code);
          return Promise.resolve({
            id: args.where.code === 'trial' ? 'trial-plan-id' : `${args.where.code}-plan-id`,
            code: args.where.code,
          });
        },
      },
      organization: {
        findMany: () => Promise.resolve([
          { id: 'org-1', subscription: null },
          { id: 'org-2', subscription: null },
          { id: 'org-3', subscription: { id: 'subscription-id' } },
        ]),
      },
      organizationSubscription: {
        createMany: () => Promise.resolve({ count: 1 }),
      },
    };

    const summary = await backfillBetaSubscriptions(prisma, new Date('2026-06-29T00:00:00.000Z'));

    assert.deepEqual(summary, {
      organizationsScanned: 3,
      subscriptionsCreated: 1,
      skipped: 2,
    });
    assert.deepEqual(upsertedCodes, [
      'trial',
      'starter',
      'founder',
      'pro',
      'pro_plus',
      'studio_beta',
    ]);
  });
});
