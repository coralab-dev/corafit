import { config } from 'dotenv';
import { resolve } from 'node:path';
import { UserPlatformRole } from '../src/generated/prisma/client';
import { createPrismaClient } from '../src/prisma-client';

config({ path: resolve(process.cwd(), '../../.env') });
config();

const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const adminSupabaseUserId = process.env.ADMIN_SUPABASE_USER_ID?.trim();
const adminName = process.env.ADMIN_NAME?.trim() || 'CoraFit Admin';

if (!adminEmail || !adminSupabaseUserId) {
  throw new Error(
    'ADMIN_EMAIL and ADMIN_SUPABASE_USER_ID are required to seed admin_saas',
  );
}

async function main() {
  const prisma = createPrismaClient();

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

  await prisma.$disconnect();
}

void main();
