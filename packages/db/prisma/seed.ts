import { config } from 'dotenv';
import { resolve } from 'node:path';
import {
  SubscriptionPlanStatus,
  UserPlatformRole,
} from '../src/generated/prisma/client';
import { createPrismaClient } from '../src/prisma-client';

config({ path: resolve(process.cwd(), '../../.env') });
config();

const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const adminSupabaseUserId = process.env.ADMIN_SUPABASE_USER_ID?.trim();
const adminName = process.env.ADMIN_NAME?.trim() || 'CoraFit Admin';

async function main() {
  const prisma = createPrismaClient();

  await prisma.subscriptionPlan.upsert({
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
      name: 'Trial',
      description: 'Plan de prueba inicial para coaches nuevos',
      priceMonthly: 0,
      clientLimit: 5,
      memberLimit: 1,
      status: SubscriptionPlanStatus.active,
    },
  });

  if (adminEmail && adminSupabaseUserId) {
    await prisma.user.upsert({
      where: { email: adminEmail },
      create: {
        email: adminEmail,
        name: adminName,
        supabaseUserId: adminSupabaseUserId,
        platformRole: UserPlatformRole.admin_saas,
      },
      update: {
        name: adminName,
        supabaseUserId: adminSupabaseUserId,
        platformRole: UserPlatformRole.admin_saas,
      },
    });
  }

  await prisma.$disconnect();
}

void main();
