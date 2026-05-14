import { PrismaClient } from './generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

export function createPrismaAdapter() {
  return new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });
}

export function createPrismaClient() {
  return new PrismaClient({ adapter: createPrismaAdapter() });
}
