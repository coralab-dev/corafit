/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ClientAccessStatus,
  ClientOperationalStatus,
  ClientTrainingPlanAssignmentStatus,
  ClientType,
  DayOfWeek,
  OrganizationMemberRole,
  OrganizationMemberStatus,
  TrainingDayType,
  TrainingPlanStatus,
  TrainingPlanType,
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
  clientPortalSession: {
    updateMany: ReturnType<typeof vi.fn>;
  };
  clientTrainingPlanAssignment: {
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  followUpNote: {
    findMany: ReturnType<typeof vi.fn>;
  };
  systemSetting: {
    findFirst: ReturnType<typeof vi.fn>;
  };
  trainingPlan: {
    create: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
  };
  trainingPlanWeek: {
    create: ReturnType<typeof vi.fn>;
  };
  trainingPlanDay: {
    create: ReturnType<typeof vi.fn>;
  };
  trainingSession: {
    create: ReturnType<typeof vi.fn>;
  };
  sessionExercise: {
    create: ReturnType<typeof vi.fn>;
  };
  sessionExerciseAlternative: {
    create: ReturnType<typeof vi.fn>;
  };
};

type ClientAccessCreateArgs = {
  data: {
    clientId: string;
    pinHash: string;
    status: ClientAccessStatus;
    tokenHash: string;
  };
};

type ClientAccessUpsertArgs = {
  create: {
    clientId: string;
    pinHash: string;
    status: ClientAccessStatus;
    tokenHash: string;
  };
};

function runMockTransaction(input: unknown, tx: PrismaServiceMock) {
  if (typeof input === 'function') {
    const runTransaction = input as (transactionClient: unknown) => Promise<unknown>;
    return runTransaction(tx);
  }

  return Promise.all(input as Array<Promise<unknown>>);
}

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

  function runCurrentMockTransaction(input: unknown) {
    return runMockTransaction(input, prismaService);
  }

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
            pinHash: data.pinHash,
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
            pinHash: create.pinHash,
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
      clientPortalSession: {
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      clientTrainingPlanAssignment: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockImplementation(
          ({ data }: { data: Record<string, unknown> }) =>
            Promise.resolve({ id: 'assignment-id', ...data }),
        ),
      },
      followUpNote: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      systemSetting: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      trainingPlan: {
        create: vi.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) =>
          Promise.resolve({ id: 'assigned-plan-id', ...data }),
        ),
        findFirst: vi.fn().mockResolvedValue(null),
      },
      trainingPlanWeek: {
        create: vi.fn().mockResolvedValue({ id: 'week-id' }),
      },
      trainingPlanDay: {
        create: vi.fn().mockResolvedValue({ id: 'day-id' }),
      },
      trainingSession: {
        create: vi.fn().mockResolvedValue({ id: 'session-id' }),
      },
      sessionExercise: {
        create: vi.fn().mockResolvedValue({ id: 'exercise-id' }),
      },
      sessionExerciseAlternative: {
        create: vi.fn().mockResolvedValue({ id: 'alt-id' }),
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
        pinHash: null,
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
          pinHash: expect.any(String),
        }),
      }),
    );
    expect(prismaService.clientPortalSession.updateMany).toHaveBeenCalledWith({
      where: { accessId: 'access-id', invalidated: false },
      data: { invalidated: true },
    });
  });

  it('generates unique tokens in a practical sample', async () => {
    vi.spyOn(service, 'hashPin').mockResolvedValue('pin-hash');
    const tokens = new Set<string>();

    for (let index = 0; index < 1000; index += 1) {
      const result = await service.regenerateAccess('client-id', createMember());
      tokens.add(result.token);
    }

    expect(tokens.size).toBe(1000);
  });

  describe('PIN operations', () => {
    it('generates a 6 digit numeric PIN', () => {
      const pin = service.generatePin();

      expect(pin).toMatch(/^\d{6}$/);
      expect(Number(pin)).toBeGreaterThanOrEqual(100000);
      expect(Number(pin)).toBeLessThanOrEqual(999999);
    });

    it('generates unique PINs in a sample', () => {
      const pins = new Set<string>();

      for (let i = 0; i < 100; i += 1) {
        pins.add(service.generatePin());
      }

      expect(pins.size).toBe(100);
    });

    it('hashes PIN with Argon2id format', async () => {
      const pin = '123456';
      const hash = await service.hashPin(pin);

      expect(hash).not.toBe(pin);
      expect(hash).toMatch(/^\$argon2/);
    });

  });

  describe('assignPlan', () => {
    const mockSourcePlan = {
      id: 'template-plan-id',
      organizationId: 'seed-org-id',
      name: 'Plan A',
      goal: 'Strength',
      level: 'intermediate',
      durationWeeks: 8,
      generalNotes: 'Test notes',
      status: TrainingPlanStatus.active,
      planType: TrainingPlanType.template,
      sourcePlanId: null,
      assignedClientId: null,
      createdByMemberId: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      weeks: [
        {
          id: 'week-1',
          trainingPlanId: 'template-plan-id',
          weekNumber: 1,
          notes: null,
          days: [
            {
              id: 'day-1',
              trainingPlanWeekId: 'week-1',
              dayOfWeek: DayOfWeek.monday,
              dayOrder: 1,
              dayType: TrainingDayType.training,
              session: {
                id: 'session-1',
                trainingPlanDayId: 'day-1',
                name: 'Day 1',
                description: null,
                coachNote: null,
                exercises: [
                  {
                    id: 'ex-1',
                    trainingSessionId: 'session-1',
                    exerciseId: 'exercise-id',
                    orderIndex: 1,
                    sets: 3,
                    reps: '10',
                    restSeconds: 60,
                    coachNote: null,
                    alternatives: [
                      {
                        id: 'alt-1',
                        sessionExerciseId: 'ex-1',
                        alternativeExerciseId: 'alternative-exercise-id',
                        note: 'Use if needed',
                      },
                    ],
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    beforeEach(() => {
      prismaService.client.findFirst.mockReset();
      prismaService.clientTrainingPlanAssignment.findFirst.mockReset();
      prismaService.trainingPlan.findFirst.mockReset();
      prismaService.systemSetting.findFirst.mockReset();
      prismaService.$transaction.mockImplementation(
        runCurrentMockTransaction as never,
      );
      prismaService.client.findFirst.mockResolvedValue(createClient());
      prismaService.clientTrainingPlanAssignment.findFirst.mockResolvedValue(null);
      prismaService.trainingPlan.findFirst.mockResolvedValue(mockSourcePlan);
      prismaService.systemSetting.findFirst.mockResolvedValue(null);
    });

    it('assignPlan throws ForbiddenException when member is undefined', async () => {
      await expect(
        service.assignPlan('client-id', { trainingPlanId: 'plan-id' }, undefined as never),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('assignPlan throws NotFoundException when client not in organization', async () => {
      prismaService.client.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.assignPlan('non-existent', { trainingPlanId: 'plan-id' }, createMember()),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('assignPlan throws NotFoundException when plan not found', async () => {
      prismaService.trainingPlan.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.assignPlan('client-id', { trainingPlanId: 'non-existent' }, createMember()),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('assignPlan throws BadRequestException when trainingPlanId is empty', async () => {
      await expect(
        service.assignPlan('client-id', { trainingPlanId: '   ' }, createMember()),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('assignPlan throws BadRequestException when startDate is invalid', async () => {
      await expect(
        service.assignPlan(
          'client-id',
          { trainingPlanId: 'template-plan-id', startDate: 'invalid-date' },
          createMember(),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('assignPlan throws ConflictException when active assignment already exists', async () => {
      prismaService.clientTrainingPlanAssignment.findFirst.mockResolvedValueOnce({
        id: 'existing-assignment-id',
        clientId: 'client-id',
        sourceTrainingPlanId: 'some-plan',
        assignedPlanId: 'some-copy',
        assignedByMemberId: 'member-id',
        startDate: new Date(),
        endedAt: null,
        status: ClientTrainingPlanAssignmentStatus.active,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        service.assignPlan('client-id', { trainingPlanId: 'plan-id' }, createMember()),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('assignPlan maps unique active assignment races to ConflictException', async () => {
      prismaService.clientTrainingPlanAssignment.create.mockRejectedValueOnce({
        code: 'P2002',
        meta: {
          target: ['client_id'],
        },
      });

      await expect(
        service.assignPlan('client-id', { trainingPlanId: 'template-plan-id' }, createMember()),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('assignPlan creates assigned copy, assignment and returns metadata', async () => {
      const result = await service.assignPlan(
        'client-id',
        { trainingPlanId: 'template-plan-id' },
        createMember(),
      );

      expect(result.assignedPlan).toBeDefined();
      expect(result.assignment).toBeDefined();
      expect(result.metadata.weeksCopied).toBe(1);
      expect(result.metadata.daysCopied).toBe(1);
      expect(result.metadata.sessionsCopied).toBe(1);
      expect(result.metadata.exercisesCopied).toBe(1);
      expect(result.metadata.alternativesCopied).toBe(1);
      expect(result.assignedPlan.planType).toBe(TrainingPlanType.assigned_copy);
      expect(result.assignedPlan.assignedClientId).toBe('client-id');
      expect(result.assignedPlan.sourcePlanId).toBe('template-plan-id');
      expect(prismaService.trainingPlan.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          assignedClientId: 'client-id',
          planType: TrainingPlanType.assigned_copy,
          sourcePlanId: 'template-plan-id',
        }),
      });
      expect(prismaService.sessionExercise.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          exerciseId: 'exercise-id',
        }),
      });
      expect(prismaService.sessionExerciseAlternative.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          alternativeExerciseId: 'alternative-exercise-id',
        }),
      });
    });

    it('assignPlan uses provided startDate when given', async () => {
      prismaService.clientTrainingPlanAssignment.create.mockResolvedValue(
        Object.assign({ id: 'assignment-id' }, { startDate: new Date('2026-06-01') }),
      );

      const result = await service.assignPlan(
        'client-id',
        { trainingPlanId: 'template-plan-id', startDate: '2026-06-01' },
        createMember(),
      );

      expect(result.assignment.startDate).toBeInstanceOf(Date);
      expect(result.assignment.startDate.toISOString().startsWith('2026-06-01')).toBe(true);
    });

    it('assignPlan uses current date when startDate not provided', async () => {
      const before = new Date();

      const result = await service.assignPlan(
        'client-id',
        { trainingPlanId: 'template-plan-id' },
        createMember(),
      );

      const after = new Date();
      expect(result.assignment.startDate.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.assignment.startDate.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });
});
