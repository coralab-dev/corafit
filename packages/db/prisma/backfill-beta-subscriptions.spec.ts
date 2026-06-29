import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  backfillBetaSubscriptions,
  buildTrialSubscriptionCreateInput,
  summarizeBackfill,
  trialPlanUpsertArgs,
} from './backfill-beta-subscriptions';

void describe('backfill beta subscriptions helpers', () => {
  void it('builds the standard public trial plan upsert args', () => {
    assert.deepEqual(trialPlanUpsertArgs(), {
      where: { code: 'trial' },
      create: {
        code: 'trial',
        name: 'Trial',
        description: 'Beta trial plan',
        priceMonthly: 0,
        currency: 'MXN',
        clientLimit: 5,
        memberLimit: 1,
        status: 'active',
      },
      update: {
        name: 'Trial',
        priceMonthly: 0,
        currency: 'MXN',
        clientLimit: 5,
        memberLimit: 1,
        status: 'active',
      },
    });
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
    const prisma = {
      subscriptionPlan: {
        upsert: () => Promise.resolve({ id: 'trial-plan-id' }),
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
  });
});
