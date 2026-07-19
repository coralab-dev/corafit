import type { Prisma } from 'db';
import type { PrismaService } from './prisma.service';

const serializableIsolationLevel: Prisma.TransactionIsolationLevel = 'Serializable';

export async function runSerializableWithRetry<T>(
  prismaService: PrismaService,
  operation: (transaction: Prisma.TransactionClient) => Promise<T>,
  attempts = 3,
): Promise<T> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await prismaService.$transaction(operation, {
        isolationLevel: serializableIsolationLevel,
      });
    } catch (error) {
      if (!isSerializableConflict(error) || attempt === attempts - 1) {
        throw error;
      }
    }
  }

  throw new Error('Serializable transaction retry limit must be positive');
}

function isSerializableConflict(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2034'
  );
}
