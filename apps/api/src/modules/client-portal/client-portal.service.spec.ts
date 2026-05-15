/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  BadRequestException,
  HttpException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import * as argon2 from 'argon2';
import { ClientAccessStatus } from 'db';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../common/prisma/prisma.service';
import { ClientPortalService } from './client-portal.service';

type PrismaServiceMock = {
  clientAccess: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  clientPortalSession: {
    create: ReturnType<typeof vi.fn>;
  };
};

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function createAccess(overrides: Record<string, unknown> = {}) {
  return {
    id: 'access-id',
    clientId: 'client-id',
    tokenHash: hashToken('plain-token'),
    pinHash: '$argon2id$valid-hash',
    status: ClientAccessStatus.active,
    failedAttempts: 0,
    lockedUntil: null,
    lastAccessAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    client: { id: 'client-id', name: 'Client One' },
    ...overrides,
  };
}

describe('ClientPortalService', () => {
  let prismaService: PrismaServiceMock;
  let service: ClientPortalService;
  let validPinHash: string;

  beforeEach(async () => {
    validPinHash = await argon2.hash('123456', {
      type: argon2.argon2id,
      memoryCost: 4096,
      timeCost: 1,
      parallelism: 1,
    });
    prismaService = {
      clientAccess: {
        findUnique: vi.fn().mockResolvedValue(createAccess()),
        update: vi.fn().mockResolvedValue(createAccess({ failedAttempts: 1 })),
      },
      clientPortalSession: {
        create: vi.fn().mockResolvedValue({
          id: 'session-id',
          accessId: 'access-id',
          sessionTokenHash: hashToken('session-token'),
          invalidated: false,
          expiresAt: new Date('2026-01-08T00:00:00.000Z'),
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
        }),
      },
    };
    service = new ClientPortalService(prismaService as unknown as PrismaService);
  });

  it('rejects malformed PINs before verification', async () => {
    await expect(
      service.verifyPin('plain-token', { pin: '12345a' }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prismaService.clientAccess.findUnique).not.toHaveBeenCalled();
  });

  it('uses generic unauthorized errors for invalid token and disabled access', async () => {
    prismaService.clientAccess.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.verifyPin('bad-token', { pin: '123456' }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ message: 'Invalid credentials' }),
    });

    prismaService.clientAccess.findUnique.mockResolvedValueOnce(
      createAccess({ status: ClientAccessStatus.disabled }),
    );

    await expect(
      service.verifyPin('plain-token', { pin: '123456' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('increments failed attempts atomically and locks on the fifth failure', async () => {
    prismaService.clientAccess.update
      .mockResolvedValueOnce(createAccess({ failedAttempts: 5 }))
      .mockResolvedValueOnce(createAccess({
        failedAttempts: 5,
        lockedUntil: new Date('2026-01-01T00:15:00.000Z'),
      }));

    await expect(
      service.verifyPin('plain-token', { pin: '000000' }),
    ).rejects.toBeInstanceOf(HttpException);

    expect(prismaService.clientAccess.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'access-id' },
      data: { failedAttempts: { increment: 1 } },
    });
    expect(prismaService.clientAccess.update).toHaveBeenNthCalledWith(2, {
      where: { id: 'access-id' },
      data: {
        lockedUntil: expect.any(Date),
        status: ClientAccessStatus.temporarily_locked,
      },
    });
  });

  it('returns 429 retry information while locked', async () => {
    prismaService.clientAccess.findUnique.mockResolvedValueOnce(
      createAccess({
        lockedUntil: new Date(Date.now() + 15 * 60 * 1000),
        status: ClientAccessStatus.temporarily_locked,
      }),
    );

    await expect(
      service.verifyPin('plain-token', { pin: '000000' }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        retryAfter: expect.any(Number),
        lockedUntil: expect.any(Date),
      }),
    });
  });

  it('resets expired lockout before counting a new failed attempt', async () => {
    prismaService.clientAccess.findUnique.mockResolvedValueOnce(
      createAccess({
        failedAttempts: 5,
        lockedUntil: new Date('2020-01-01T00:15:00.000Z'),
      }),
    );
    prismaService.clientAccess.update
      .mockResolvedValueOnce(createAccess({ failedAttempts: 0, lockedUntil: null }))
      .mockResolvedValueOnce(createAccess({ failedAttempts: 1, lockedUntil: null }));

    const result = await service.verifyPin('plain-token', { pin: '000000' });

    expect(prismaService.clientAccess.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'access-id' },
      data: {
        failedAttempts: 0,
        lockedUntil: null,
        status: ClientAccessStatus.active,
      },
    });
    expect(result.locked).toBe(false);
    expect(result.remainingAttempts).toBe(4);
  });

  it('creates a session with a hashed opaque token after a valid PIN', async () => {
    prismaService.clientAccess.findUnique.mockResolvedValueOnce(
      createAccess({ pinHash: validPinHash }),
    );

    const result = await service.verifyPin('plain-token', { pin: '123456' });

    expect(result.sessionToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(prismaService.clientPortalSession.create).toHaveBeenCalledWith({
      data: {
        accessId: 'access-id',
        sessionTokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        expiresAt: expect.any(Date),
      },
    });
    expect(result.sessionToken).not.toBe('session-id');
  });
});
