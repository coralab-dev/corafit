/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  ClientOperationalStatus,
  ClientType,
  OrganizationMemberRole,
  OrganizationMemberStatus,
  type Client,
  type ClientAccess,
  type OrganizationMember,
} from 'db';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../common/prisma/prisma.service';
import { ProgressService } from './progress.service';

type PrismaServiceMock = {
  client: {
    findFirst: ReturnType<typeof vi.fn>;
  };
  weightLog: {
    create: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  bodyMeasurementLog: {
    create: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};

function createMember(overrides: Partial<OrganizationMember> = {}): OrganizationMember {
  return {
    id: 'member-id',
    organizationId: 'organization-id',
    userId: 'user-id',
    role: OrganizationMemberRole.coach,
    status: OrganizationMemberStatus.active,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function createClient(overrides: Partial<Client> = {}): Client {
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
    canRegisterWeight: true,
    operationalStatus: ClientOperationalStatus.active,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function createAccess(client: Client): ClientAccess & { client: Client } {
  return {
    id: 'access-id',
    clientId: client.id,
    tokenHash: 'token-hash',
    pinHash: 'pin-hash',
    status: 'active',
    failedAttempts: 0,
    lockedUntil: null,
    lastAccessAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    client,
  };
}

describe('ProgressService', () => {
  let prismaService: PrismaServiceMock;
  let service: ProgressService;

  beforeEach(() => {
    prismaService = {
      client: {
        findFirst: vi.fn().mockResolvedValue(createClient()),
      },
      weightLog: {
        create: vi.fn().mockResolvedValue({ id: 'weight-log-id' }),
        findFirst: vi.fn().mockResolvedValue({
          id: 'weight-log-id',
          clientId: 'client-id',
          recordedByType: 'client',
          recordedByMemberId: null,
          deletedAt: null,
        }),
        findMany: vi.fn().mockResolvedValue([]),
        update: vi.fn().mockResolvedValue({ id: 'weight-log-id' }),
      },
      bodyMeasurementLog: {
        create: vi.fn().mockResolvedValue({ id: 'measurement-id' }),
        findFirst: vi.fn().mockResolvedValue({
          id: 'measurement-id',
          clientId: 'client-id',
          deletedAt: null,
        }),
        findMany: vi.fn().mockResolvedValue([]),
        update: vi.fn().mockResolvedValue({ id: 'measurement-id' }),
      },
    };
    service = new ProgressService(prismaService as unknown as PrismaService);
  });

  it('allows owner to list client weight logs in their organization', async () => {
    const owner = createMember({ role: OrganizationMemberRole.owner, id: 'owner-id' });

    await service.listWeightLogs('client-id', {}, owner);

    expect(prismaService.weightLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ clientId: 'client-id', deletedAt: null }),
        orderBy: [{ recordedAt: 'desc' }, { createdAt: 'desc' }],
      }),
    );
  });

  it('allows assigned coach to create a body measurement', async () => {
    const coach = createMember({ id: 'member-id', role: OrganizationMemberRole.coach });

    await service.createBodyMeasurement(
      'client-id',
      { waistCm: 80, recordedAt: '2026-06-01T00:00:00.000Z' },
      coach,
    );

    expect(prismaService.bodyMeasurementLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          clientId: 'client-id',
          recordedByMemberId: 'member-id',
          waistCm: 80,
          visibleToClient: false,
        }),
      }),
    );
  });

  it('forbids unassigned coach from sensitive progress', async () => {
    const coach = createMember({ id: 'other-member-id', role: OrganizationMemberRole.coach });

    await expect(service.listWeightLogs('client-id', {}, coach)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('requires canRegisterWeight before client creates weight', async () => {
    const client = createClient({ canRegisterWeight: false });

    await expect(
      service.createClientWeightLog(createAccess(client), { weightKg: 70 }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('forbids client from editing coach-created weight', async () => {
    prismaService.weightLog.findFirst.mockResolvedValue({
      id: 'weight-log-id',
      clientId: 'client-id',
      recordedByType: 'coach',
      recordedByMemberId: 'member-id',
      deletedAt: null,
    });

    await expect(
      service.updateClientWeightLog(createAccess(createClient()), 'weight-log-id', {
        weightKg: 71,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects empty client portal weight patch', async () => {
    await expect(
      service.updateClientWeightLog(createAccess(createClient()), 'weight-log-id', {}),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects empty weight patch', async () => {
    await expect(
      service.updateWeightLog('client-id', 'weight-log-id', {}, createMember()),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('only returns visible body measurements to client portal', async () => {
    await service.listClientBodyMeasurements(createAccess(createClient()), {});

    expect(prismaService.bodyMeasurementLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          clientId: 'client-id',
          deletedAt: null,
          visibleToClient: true,
        }),
      }),
    );
  });

  it('rejects empty body measurement patch', async () => {
    await expect(
      service.updateBodyMeasurement('client-id', 'measurement-id', {}, createMember()),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects body measurement create without measurements', async () => {
    await expect(
      service.createBodyMeasurement('client-id', { note: 'Only note' }, createMember()),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects body measurement create with only null measurements', async () => {
    await expect(
      service.createBodyMeasurement('client-id', { waistCm: null, hipCm: null }, createMember()),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('soft deletes weight and excludes deleted records from lists', async () => {
    const owner = createMember({ role: OrganizationMemberRole.owner, id: 'owner-id' });

    await service.deleteWeightLog('client-id', 'weight-log-id', owner);
    await service.listWeightLogs('client-id', {}, owner);

    expect(prismaService.weightLog.update).toHaveBeenCalledWith({
      where: { id: 'weight-log-id' },
      data: { deletedAt: expect.any(Date) },
    });
    expect(prismaService.weightLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ deletedAt: null }),
      }),
    );
  });
});
