/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ClientAccessStatus,
  ClientOperationalStatus,
  ClientType,
  OrganizationMemberRole,
  OrganizationMemberStatus,
  type OrganizationMember,
} from 'db';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../common/prisma/prisma.service';
import { ClientsService } from './clients.service';

type PrismaServiceMock = {
  $transaction: ReturnType<typeof vi.fn>;
  client: {
    count: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  clientAccess: {
    create: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
  };
  followUpNote: {
    findMany: ReturnType<typeof vi.fn>;
  };
};

type ClientAccessCreateArgs = {
  data: {
    clientId: string;
    status: ClientAccessStatus;
    tokenHash: string;
  };
};

type ClientAccessUpsertArgs = {
  create: {
    clientId: string;
    status: ClientAccessStatus;
    tokenHash: string;
  };
};

function createMember(): OrganizationMember {
  return {
    id: 'member-id',
    organizationId: 'organization-id',
    userId: 'user-id',
    role: OrganizationMemberRole.owner,
    status: OrganizationMemberStatus.active,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };
}

function createClient(overrides = {}) {
  return {
    id: 'client-id',
    organizationId: 'organization-id',
    assignedCoachMemberId: 'member-id',
    name: 'Client One',
    phone: null,
    age: null,
    sex: null,
    clientType: ClientType.online,
    mainGoal: 'Strength',
    heightCm: 170,
    initialWeightKg: 70,
    trainingLevel: null,
    injuriesNotes: null,
    generalNotes: null,
    canRegisterWeight: false,
    operationalStatus: ClientOperationalStatus.active,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('ClientsService', () => {
  let prismaService: PrismaServiceMock;
  let service: ClientsService;

  beforeEach(() => {
    prismaService = {
      $transaction: vi.fn(async (operations: Array<Promise<unknown>>) =>
        Promise.all(operations),
      ),
      client: {
        count: vi.fn().mockResolvedValue(1),
        create: vi.fn().mockResolvedValue(createClient()),
        findFirst: vi.fn().mockResolvedValue(createClient()),
        findMany: vi.fn().mockResolvedValue([createClient()]),
        update: vi.fn().mockResolvedValue(
          createClient({ operationalStatus: ClientOperationalStatus.archived }),
        ),
      },
      clientAccess: {
        create: vi.fn().mockImplementation(({ data }: ClientAccessCreateArgs) =>
          Promise.resolve({
            id: 'access-id',
            clientId: data.clientId,
            tokenHash: data.tokenHash,
            status: data.status,
            failedAttempts: 0,
            lockedUntil: null,
            lastAccessAt: null,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          }),
        ),
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
        upsert: vi.fn().mockImplementation(({ create }: ClientAccessUpsertArgs) =>
          Promise.resolve({
            id: 'access-id',
            clientId: create.clientId,
            tokenHash: create.tokenHash,
            status: create.status,
            failedAttempts: 0,
            lockedUntil: null,
            lastAccessAt: null,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          }),
        ),
      },
      followUpNote: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };
    const configService = {
      get: vi.fn().mockReturnValue('https://corafit-web.vercel.app'),
    };
    service = new ClientsService(
      prismaService as unknown as PrismaService,
      configService as unknown as ConfigService,
    );
  });

  it('creates a client in the current organization', async () => {
    await service.create(
      {
        name: ' Client One ',
        clientType: ClientType.online,
        mainGoal: 'Strength',
        heightCm: 170,
        initialWeightKg: 70,
      },
      createMember(),
    );

    expect(prismaService.client.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        assignedCoachMemberId: 'member-id',
        clientType: ClientType.online,
        mainGoal: 'Strength',
        name: 'Client One',
        organizationId: 'organization-id',
      }),
    });
  });

  it('excludes archived clients from the default list', async () => {
    await service.list({}, createMember());

    expect(prismaService.client.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          operationalStatus: { not: ClientOperationalStatus.archived },
        }),
      }),
    );
  });

  it('archives clients through status updates', async () => {
    const result = await service.updateStatus(
      'client-id',
      { status: ClientOperationalStatus.archived },
      createMember(),
    );

    expect(result.operationalStatus).toBe(ClientOperationalStatus.archived);
    expect(prismaService.client.update).toHaveBeenCalledWith({
      where: { id: 'client-id' },
      data: { operationalStatus: ClientOperationalStatus.archived },
    });
  });

  it('returns an empty notes array when the client has no notes', async () => {
    await expect(service.getNotes('client-id', createMember())).resolves.toEqual([]);
  });

  it('getById throws NotFoundException when client not in organization', async () => {
    prismaService.client.findFirst.mockResolvedValueOnce(null);

    await expect(service.getById('client-id', createMember())).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('getById throws NotFoundException when client does not exist', async () => {
    prismaService.client.findFirst.mockResolvedValueOnce(null);

    await expect(service.getById('non-existent-id', createMember())).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('createAccess throws ConflictException when active access already exists', async () => {
    prismaService.clientAccess.findUnique.mockResolvedValueOnce({
      id: 'existing-access-id',
      clientId: 'client-id',
      tokenHash: 'somehash',
      status: ClientAccessStatus.active,
      failedAttempts: 0,
      lockedUntil: null,
      lastAccessAt: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    await expect(service.createAccess('client-id', createMember())).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('createAccess reuses disabled access with new token', async () => {
    prismaService.clientAccess.findUnique.mockResolvedValueOnce({
      id: 'existing-access-id',
      clientId: 'client-id',
      tokenHash: 'oldhash',
      status: ClientAccessStatus.disabled,
      failedAttempts: 5,
      lockedUntil: new Date('2026-01-01T12:00:00.000Z'),
      lastAccessAt: new Date('2026-01-01T10:00:00.000Z'),
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    prismaService.clientAccess.update.mockResolvedValueOnce({
      id: 'existing-access-id',
      clientId: 'client-id',
      tokenHash: 'newhash',
      status: ClientAccessStatus.active,
      failedAttempts: 0,
      lockedUntil: null,
      lastAccessAt: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    const result = await service.createAccess('client-id', createMember());

    expect(prismaService.clientAccess.update).toHaveBeenCalledWith({
      where: { clientId: 'client-id' },
      data: expect.objectContaining({
        tokenHash: expect.any(String),
        status: ClientAccessStatus.active,
        failedAttempts: 0,
        lockedUntil: null,
      }),
    });
    expect(result.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('disableAccess throws NotFoundException when no access exists', async () => {
    prismaService.clientAccess.findUnique.mockResolvedValueOnce(null);

    await expect(service.disableAccess('client-id', createMember())).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('disableAccess sets tokenHash to null and status to disabled', async () => {
    prismaService.clientAccess.findUnique.mockResolvedValueOnce({
      id: 'access-id',
      clientId: 'client-id',
      tokenHash: 'somehash',
      status: ClientAccessStatus.active,
      failedAttempts: 0,
      lockedUntil: null,
      lastAccessAt: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    prismaService.clientAccess.update.mockResolvedValueOnce({
      id: 'access-id',
      clientId: 'client-id',
      tokenHash: null,
      status: ClientAccessStatus.disabled,
      failedAttempts: 0,
      lockedUntil: null,
      lastAccessAt: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    const result = await service.disableAccess('client-id', createMember());

    expect(prismaService.clientAccess.update).toHaveBeenCalledWith({
      where: { clientId: 'client-id' },
      data: {
        tokenHash: null,
        status: ClientAccessStatus.disabled,
      },
    });
    expect(result.tokenHash).toBeNull();
    expect(result.status).toBe(ClientAccessStatus.disabled);
  });

  it('list filters by operationalStatus when provided', async () => {
    await service.list({ status: ClientOperationalStatus.paused }, createMember());

    expect(prismaService.client.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          operationalStatus: ClientOperationalStatus.paused,
        }),
      }),
    );
  });

  it('list handles pagination with page and limit', async () => {
    prismaService.client.findMany.mockResolvedValueOnce([createClient(), createClient()]);
    prismaService.client.count.mockResolvedValueOnce(2);

    const result = await service.list({ page: '2', limit: '10' }, createMember());

    expect(prismaService.client.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 10,
      }),
    );
    expect(result.page).toBe(2);
    expect(result.limit).toBe(10);
  });

  it('generates a 32 byte base64url token and stores only its hash', async () => {
    const result = await service.createAccess('client-id', createMember());

    expect(result.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(result.link).toBe(
      `https://corafit-web.vercel.app/c/${result.token}`,
    );
    expect(prismaService.clientAccess.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        clientId: 'client-id',
        status: ClientAccessStatus.active,
        tokenHash: expect.not.stringMatching(result.token),
      }),
    });
  });

  it('regenerates access by replacing the token hash', async () => {
    const result = await service.regenerateAccess('client-id', createMember());

    expect(result.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(prismaService.clientAccess.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { clientId: 'client-id' },
        update: expect.objectContaining({
          status: ClientAccessStatus.active,
          tokenHash: expect.any(String),
        }),
      }),
    );
  });

  it('generates unique tokens in a practical sample', async () => {
    const tokens = new Set<string>();

    for (let index = 0; index < 1000; index += 1) {
      const result = await service.regenerateAccess('client-id', createMember());
      tokens.add(result.token);
    }

    expect(tokens.size).toBe(1000);
  });

  it('validates plain tokens by hashing before lookup', async () => {
    await service.findAccessByPlainToken('plain-token');

    expect(prismaService.clientAccess.findUnique).toHaveBeenCalledWith({
      where: {
        tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      },
      include: { client: true },
    });
  });
});
