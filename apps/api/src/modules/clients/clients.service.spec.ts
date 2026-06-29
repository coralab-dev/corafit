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
  SubscriptionStatus,
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
  organizationSubscription: {
    findUnique: ReturnType<typeof vi.fn>;
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
    update: ReturnType<typeof vi.fn>;
  };
  followUpNote: {
    findMany: ReturnType<typeof vi.fn>;
  };
  exercise: {
    findFirst: ReturnType<typeof vi.fn>;
  };
  systemSetting: {
    findFirst: ReturnType<typeof vi.fn>;
  };
  trainingPlan: {
    create: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  trainingPlanWeek: {
    create: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
  };
  trainingPlanDay: {
    create: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
  };
  trainingSession: {
    create: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  sessionExercise: {
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  sessionExerciseAlternative: {
    count: ReturnType<typeof vi.fn>;
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
      $transaction: vi.fn((input: unknown) => runMockTransaction(input, prismaService)),
      client: {
        count: vi.fn().mockResolvedValue(1),
        create: vi.fn().mockResolvedValue(createClient()),
        findFirst: vi.fn().mockResolvedValue(createClient()),
        findMany: vi.fn().mockResolvedValue([createClient()]),
        update: vi.fn().mockResolvedValue(
          createClient({ operationalStatus: ClientOperationalStatus.archived }),
        ),
      },
      organizationSubscription: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'subscription-id',
          organizationId: 'organization-id',
          subscriptionPlanId: 'plan-id',
          status: SubscriptionStatus.trial,
          startedAt: new Date('2026-01-01T00:00:00.000Z'),
          renewsAt: null,
          cancelledAt: null,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          subscriptionPlan: {
            id: 'plan-id',
            code: 'trial',
            name: 'Trial',
            description: null,
            priceMonthly: 0,
            currency: 'MXN',
            clientLimit: 5,
            memberLimit: 1,
            features: null,
            isPublic: true,
            status: 'active',
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          },
        }),
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
        update: vi.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) =>
          Promise.resolve({ id: 'assignment-id', ...data }),
        ),
      },
      followUpNote: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      exercise: {
        findFirst: vi.fn().mockResolvedValue({ id: 'exercise-id' }),
      },
      systemSetting: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      trainingPlan: {
        create: vi.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) =>
          Promise.resolve({ id: 'assigned-plan-id', ...data }),
        ),
        findFirst: vi.fn().mockResolvedValue(null),
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) =>
          Promise.resolve({ id: 'updated-plan-id', ...data }),
        ),
      },
      trainingPlanWeek: {
        create: vi.fn().mockResolvedValue({ id: 'week-id' }),
        findFirst: vi.fn().mockResolvedValue(null),
      },
      trainingPlanDay: {
        create: vi.fn().mockResolvedValue({ id: 'day-id' }),
        findFirst: vi.fn().mockResolvedValue(null),
      },
      trainingSession: {
        create: vi.fn().mockResolvedValue({ id: 'session-id' }),
        findFirst: vi.fn().mockResolvedValue({ id: 'session-id' }),
        update: vi.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) =>
          Promise.resolve({ id: 'session-id', ...data }),
        ),
      },
      sessionExercise: {
        create: vi.fn().mockResolvedValue({ id: 'exercise-id' }),
        findMany: vi.fn().mockResolvedValue([
          { id: 'session-exercise-id', trainingSessionId: 'session-id' },
        ]),
        findFirst: vi.fn().mockResolvedValue({ id: 'session-exercise-id' }),
        update: vi.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) =>
          Promise.resolve({ id: 'session-exercise-id', ...data }),
        ),
      },
      sessionExerciseAlternative: {
        count: vi.fn().mockResolvedValue(0),
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
    expect(prismaService.client.count).toHaveBeenCalledWith({
      where: {
        organizationId: 'organization-id',
        operationalStatus: { not: ClientOperationalStatus.archived },
      },
    });
  });

  it('blocks client creation when the subscription client limit is reached', async () => {
    prismaService.client.count.mockResolvedValueOnce(5);

    await expect(
      service.create(
        {
          name: 'Client One',
          clientType: ClientType.online,
          mainGoal: 'Strength',
          heightCm: 170,
          initialWeightKg: 70,
        },
        createMember(),
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(prismaService.client.create).not.toHaveBeenCalled();
  });

  it('blocks client creation when subscription is not active for operations', async () => {
    prismaService.organizationSubscription.findUnique.mockResolvedValueOnce({
      status: SubscriptionStatus.suspended,
      subscriptionPlan: { clientLimit: 5 },
    });

    await expect(
      service.create(
        {
          name: 'Client One',
          clientType: ClientType.online,
          mainGoal: 'Strength',
          heightCm: 170,
          initialWeightKg: 70,
        },
        createMember(),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('excludes archived clients from the default list', async () => {
    await service.list({}, createMember());

    expect(prismaService.client.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          access: true,
          planAssignments: expect.any(Object),
        }),
        where: expect.objectContaining({
          operationalStatus: { not: ClientOperationalStatus.archived },
        }),
      }),
    );
  });

  it('returns client access and current assignment summaries in the list', async () => {
    const startedAt = new Date('2026-06-01T00:00:00.000Z');
    prismaService.client.findMany.mockResolvedValueOnce([
      createClient({
        access: {
          id: 'access-id',
          status: ClientAccessStatus.active,
          createdAt: new Date('2026-06-01T00:00:00.000Z'),
          updatedAt: new Date('2026-06-02T00:00:00.000Z'),
          lastAccessAt: null,
          lockedUntil: null,
        },
        planAssignments: [
          {
            id: 'assignment-id',
            assignedPlanId: 'assigned-plan-id',
            sourceTrainingPlanId: 'source-plan-id',
            startDate: startedAt,
            endedAt: null,
            status: ClientTrainingPlanAssignmentStatus.active,
            assignedPlan: {
              id: 'assigned-plan-id',
              name: 'Assigned Plan',
              goal: 'Strength',
              level: 'beginner',
              durationWeeks: 4,
              generalNotes: null,
              planType: TrainingPlanType.assigned_copy,
              status: TrainingPlanStatus.active,
            },
            sourcePlan: {
              id: 'source-plan-id',
              name: 'Template Plan',
            },
          },
        ],
      }),
    ]);

    const result = await service.list({}, createMember());

    expect(result.items[0]).toMatchObject({
      id: 'client-id',
      access: {
        id: 'access-id',
        status: ClientAccessStatus.active,
      },
      currentAssignment: {
        assignment: {
          id: 'assignment-id',
          startDate: startedAt,
          status: ClientTrainingPlanAssignmentStatus.active,
        },
        assignedPlan: {
          id: 'assigned-plan-id',
          name: 'Assigned Plan',
          durationWeeks: 4,
        },
        sourcePlan: {
          id: 'source-plan-id',
          name: 'Template Plan',
        },
      },
    });
    expect(result.items[0]).not.toHaveProperty('assignments');
    expect(result.items[0]).not.toHaveProperty('planAssignments');
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

  it('getAccess returns access timestamps for coach access management', async () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const updatedAt = new Date('2026-01-02T00:00:00.000Z');
    prismaService.clientAccess.findUnique.mockResolvedValueOnce({
      id: 'access-id',
      clientId: 'client-id',
      tokenHash: 'token-hash',
      status: ClientAccessStatus.active,
      failedAttempts: 0,
      lockedUntil: null,
      lastAccessAt: null,
      createdAt,
      updatedAt,
    });

    const result = await service.getAccess('client-id', createMember());

    expect(result).toEqual({
      clientId: 'client-id',
      id: 'access-id',
      lastAccessAt: null,
      lockedUntil: null,
      status: ClientAccessStatus.active,
      createdAt,
      updatedAt,
    });
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

  describe('getCurrentPlanAssignment', () => {
    it('returns null when no active assignment exists', async () => {
      const result = await service.getCurrentPlanAssignment('client-id', createMember());

      expect(result).toBeNull();
      expect(prismaService.clientTrainingPlanAssignment.findFirst).toHaveBeenCalledWith({
        where: {
          clientId: 'client-id',
          status: ClientTrainingPlanAssignmentStatus.active,
        },
      });
    });

    it('returns assignment with sourcePlan and assignedPlan tree when active', async () => {
      prismaService.clientTrainingPlanAssignment.findFirst.mockResolvedValue({
        id: 'assignment-id',
        clientId: 'client-id',
        sourceTrainingPlanId: 'source-plan-id',
        assignedPlanId: 'assigned-plan-id',
        assignedByMemberId: 'member-id',
        startDate: new Date('2026-06-01'),
        endedAt: null,
        status: ClientTrainingPlanAssignmentStatus.active,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      prismaService.trainingPlan.findUnique
        .mockResolvedValueOnce({ id: 'source-plan-id', name: 'Source Plan' })
        .mockResolvedValueOnce({
          id: 'assigned-plan-id',
          name: 'Assigned Copy',
          planType: TrainingPlanType.assigned_copy,
          weeks: [],
        });

      const result = await service.getCurrentPlanAssignment('client-id', createMember());

      expect(result).not.toBeNull();
      expect(result?.assignment.id).toBe('assignment-id');
      expect(result?.sourcePlan?.id).toBe('source-plan-id');
      expect(result?.assignedPlan?.id).toBe('assigned-plan-id');
    });

    it('throws NotFoundException when client not in organization', async () => {
      prismaService.client.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.getCurrentPlanAssignment('non-existent', createMember()),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('updateCurrentPlanAssignment', () => {
    const mockAssignment = {
      id: 'assignment-id',
      clientId: 'client-id',
      sourceTrainingPlanId: 'source-plan-id',
      assignedPlanId: 'assigned-plan-id',
      assignedByMemberId: 'member-id',
      startDate: new Date('2026-06-01'),
      endedAt: null,
      status: ClientTrainingPlanAssignmentStatus.active,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      prismaService.clientTrainingPlanAssignment.findFirst.mockResolvedValue(mockAssignment);
      prismaService.trainingPlan.findUnique.mockResolvedValue({
        id: 'assigned-plan-id',
        planType: TrainingPlanType.assigned_copy,
      });
    });

    it('throws NotFoundException when no active assignment exists', async () => {
      prismaService.clientTrainingPlanAssignment.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.updateCurrentPlanAssignment('client-id', { name: 'New Name' }, createMember()),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws BadRequestException when plan is not assigned_copy', async () => {
      prismaService.trainingPlan.findUnique.mockResolvedValueOnce({
        id: 'assigned-plan-id',
        planType: TrainingPlanType.template,
      });

      await expect(
        service.updateCurrentPlanAssignment('client-id', { name: 'New Name' }, createMember()),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('updates plan metadata, session and exercise fields on the assigned copy', async () => {
      const result = await service.updateCurrentPlanAssignment(
        'client-id',
        {
          name: 'Updated Name',
          goal: 'Hypertrophy',
          durationWeeks: 12,
          generalNotes: null,
          sessions: [
            {
              sessionId: 'session-id',
              name: 'Upper Day',
              coachNote: null,
            },
          ],
          exercises: [
            {
              sessionExerciseId: 'session-exercise-id',
              exerciseId: 'replacement-exercise-id',
              sets: 4,
              reps: '8-10',
              restSeconds: 90,
              coachNote: 'Keep two reps in reserve',
            },
          ],
        },
        createMember(),
      );

      expect(prismaService.trainingPlan.update).toHaveBeenCalledWith({
        where: { id: 'assigned-plan-id' },
        data: {
          name: 'Updated Name',
          goal: 'Hypertrophy',
          durationWeeks: 12,
          generalNotes: null,
        },
        include: expect.any(Object),
      });
      expect(prismaService.trainingSession.update).toHaveBeenCalledWith({
        where: { id: 'session-id' },
        data: { name: 'Upper Day', coachNote: null },
      });
      expect(prismaService.sessionExercise.update).toHaveBeenCalledWith({
        where: { id: 'session-exercise-id' },
        data: {
          exerciseId: 'replacement-exercise-id',
          sets: 4,
          reps: '8-10',
          restSeconds: 90,
          coachNote: 'Keep two reps in reserve',
        },
      });
      expect(prismaService.exercise.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'replacement-exercise-id',
          OR: [{ organizationId: null }, { organizationId: 'organization-id' }],
        },
      });
      expect(result.assignment.id).toBe('assignment-id');
      expect(result.assignedPlan.name).toBe('Updated Name');
    });

    it('does not update the source template when patching assigned plan details', async () => {
      await service.updateCurrentPlanAssignment(
        'client-id',
        {
          exercises: [
            {
              sessionExerciseId: 'session-exercise-id',
              sets: 3,
              reps: '12',
            },
          ],
        },
        createMember(),
      );

      expect(prismaService.trainingPlan.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'assigned-plan-id' },
        }),
      );
      expect(prismaService.trainingPlan.update).not.toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'source-plan-id' },
        }),
      );
      expect(prismaService.sessionExercise.update).toHaveBeenCalledWith({
        where: { id: 'session-exercise-id' },
        data: { sets: 3, reps: '12' },
      });
    });

    it('throws BadRequestException when patch body has no changes', async () => {
      await expect(
        service.updateCurrentPlanAssignment('client-id', {}, createMember()),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects invalid durationWeeks', async () => {
      await expect(
        service.updateCurrentPlanAssignment('client-id', { durationWeeks: 0 }, createMember()),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects invalid training level values', async () => {
      await expect(
        service.updateCurrentPlanAssignment(
          'client-id',
          { level: 'expert' },
          createMember(),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws NotFoundException when session exercise does not belong to assigned plan', async () => {
      prismaService.sessionExercise.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.updateCurrentPlanAssignment(
          'client-id',
          {
            exercises: [
              {
                sessionExerciseId: 'other-exercise-id',
                reps: '10',
              },
            ],
          },
          createMember(),
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('current assignment structural editing', () => {
    const mockAssignment = {
      id: 'assignment-id',
      clientId: 'client-id',
      sourceTrainingPlanId: 'source-plan-id',
      assignedPlanId: 'assigned-plan-id',
      assignedByMemberId: 'member-id',
      startDate: new Date('2026-06-01'),
      endedAt: null,
      status: ClientTrainingPlanAssignmentStatus.active,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      prismaService.clientTrainingPlanAssignment.findFirst.mockResolvedValue(mockAssignment);
      prismaService.trainingPlan.findUnique.mockResolvedValue({
        id: 'assigned-plan-id',
        durationWeeks: 4,
        planType: TrainingPlanType.assigned_copy,
      });
      prismaService.trainingPlanWeek.findFirst.mockResolvedValue(null);
      prismaService.trainingSession.findFirst.mockResolvedValue({
        id: 'session-id',
        day: {
          week: {
            trainingPlanId: 'assigned-plan-id',
          },
        },
      });
    });

    it('creates weeks only on the current assigned copy', async () => {
      await service.createCurrentAssignmentWeek(
        'client-id',
        { weekNumber: 5, notes: 'Deload' },
        createMember(),
      );

      expect(prismaService.trainingPlanWeek.create).toHaveBeenCalledWith({
        data: {
          trainingPlanId: 'assigned-plan-id',
          weekNumber: 5,
          notes: 'Deload',
        },
      });
      expect(prismaService.trainingPlan.update).toHaveBeenCalledWith({
        where: { id: 'assigned-plan-id' },
        data: { durationWeeks: 5 },
      });
      expect(prismaService.trainingPlanWeek.create).not.toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ trainingPlanId: 'source-plan-id' }),
        }),
      );
    });

    it('adds an exercise only when the session belongs to the current assigned copy', async () => {
      await service.createCurrentAssignmentSessionExercise(
        'client-id',
        'session-id',
        {
          exerciseId: 'exercise-id',
          reps: '8-10',
          sets: 3,
        },
        createMember(),
      );

      expect(prismaService.trainingSession.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'session-id',
          day: {
            week: {
              trainingPlanId: 'assigned-plan-id',
            },
          },
        },
      });
      expect(prismaService.sessionExercise.create).toHaveBeenCalledWith({
        data: {
          trainingSessionId: 'session-id',
          exerciseId: 'exercise-id',
          orderIndex: 0,
          sets: 3,
          reps: '8-10',
          restSeconds: null,
          coachNote: null,
        },
      });
    });

    it('rejects structural edits when the target node is outside the current assigned copy', async () => {
      prismaService.trainingSession.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.createCurrentAssignmentSessionExercise(
          'client-id',
          'foreign-session-id',
          {
            exerciseId: 'exercise-id',
            reps: '8-10',
          },
          createMember(),
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('endCurrentPlanAssignment', () => {
    const mockAssignment = {
      id: 'assignment-id',
      clientId: 'client-id',
      sourceTrainingPlanId: 'source-plan-id',
      assignedPlanId: 'assigned-plan-id',
      assignedByMemberId: 'member-id',
      startDate: new Date('2026-06-01'),
      endedAt: null,
      status: ClientTrainingPlanAssignmentStatus.active,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      prismaService.clientTrainingPlanAssignment.findFirst.mockResolvedValue(mockAssignment);
    });

    it('throws NotFoundException when no active assignment exists', async () => {
      prismaService.clientTrainingPlanAssignment.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.endCurrentPlanAssignment('client-id', createMember()),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('updates status to finished and sets endedAt', async () => {
      const before = new Date();
      const result = await service.endCurrentPlanAssignment('client-id', createMember());
      const after = new Date();

      expect(result.status).toBe(ClientTrainingPlanAssignmentStatus.finished);
      expect(result.endedAt).toBeInstanceOf(Date);
      expect(result.endedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.endedAt.getTime()).toBeLessThanOrEqual(after.getTime());
      expect(prismaService.clientTrainingPlanAssignment.update).toHaveBeenCalledWith({
        where: { id: 'assignment-id' },
        data: {
          status: ClientTrainingPlanAssignmentStatus.finished,
          endedAt: expect.any(Date),
        },
      });
    });
  });
});
