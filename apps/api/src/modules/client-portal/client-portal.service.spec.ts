/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  BadRequestException,
  HttpException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import * as argon2 from 'argon2';
import {
  ClientAccessStatus,
  ClientSessionStatus,
  ClientTrainingPlanAssignmentStatus,
  DayOfWeek,
  OrganizationStatus,
  TrainingDayType,
} from 'db';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../common/prisma/prisma.service';
import { ClientPortalService } from './client-portal.service';
import { ClientStreakService } from './client-streak.service';

type PrismaServiceMock = {
  $transaction: ReturnType<typeof vi.fn>;
  client: {
    findUnique: ReturnType<typeof vi.fn>;
  };
  clientAccess: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  clientPortalSession: {
    create: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
  };
  clientSessionLog: {
    findMany: ReturnType<typeof vi.fn>;
  };
  clientTrainingPlanAssignment: {
    findFirst: ReturnType<typeof vi.fn>;
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
    client: {
      id: 'client-id',
      name: 'Client One',
      organization: {
        id: 'org-id',
        status: OrganizationStatus.active,
      },
    },
    ...overrides,
  };
}

function createClient(overrides: Record<string, unknown> = {}) {
  return {
    id: 'client-id',
    organizationId: 'org-id',
    assignedCoachMemberId: null,
    name: 'Client One',
    phone: null,
    age: null,
    sex: null,
    clientType: 'online',
    mainGoal: 'Strength',
    heightCm: 170,
    initialWeightKg: 70,
    trainingLevel: null,
    injuriesNotes: null,
    generalNotes: null,
    canRegisterWeight: false,
    operationalStatus: 'active',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    organization: {
      id: 'org-id',
      name: 'Org',
      timezone: 'America/Mexico_City',
      status: OrganizationStatus.active,
    },
    ...overrides,
  };
}

function createSession(dayOfWeek: DayOfWeek, overrides: Record<string, unknown> = {}) {
  return {
    id: `session-${dayOfWeek}`,
    trainingPlanDayId: `day-${dayOfWeek}`,
    name: `${dayOfWeek} session`,
    description: null,
    coachNote: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function createPlanDay(
  dayOfWeek: DayOfWeek,
  dayOrder: number,
  session: ReturnType<typeof createSession> | null,
  overrides: Record<string, unknown> = {},
) {
  return {
    id: `day-${dayOfWeek}`,
    trainingPlanWeekId: 'week-1',
    dayOfWeek,
    dayOrder,
    dayType: session ? TrainingDayType.training : TrainingDayType.rest,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    session,
    ...overrides,
  };
}

function createAssignment(overrides: Record<string, unknown> = {}) {
  return {
    id: 'assignment-id',
    clientId: 'client-id',
    sourceTrainingPlanId: 'template-plan-id',
    assignedPlanId: 'assigned-plan-id',
    assignedByMemberId: 'member-id',
    startDate: new Date('2026-05-18T06:00:00.000Z'),
    endedAt: null,
    status: ClientTrainingPlanAssignmentStatus.active,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    assignedPlan: {
      id: 'assigned-plan-id',
      name: 'Assigned Plan',
      durationWeeks: 4,
      weeks: [
        {
          id: 'week-1',
          trainingPlanId: 'assigned-plan-id',
          weekNumber: 1,
          notes: null,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          days: [
            createPlanDay(DayOfWeek.monday, 1, createSession(DayOfWeek.monday)),
            createPlanDay(DayOfWeek.wednesday, 3, createSession(DayOfWeek.wednesday)),
            createPlanDay(DayOfWeek.friday, 5, createSession(DayOfWeek.friday)),
          ],
        },
      ],
    },
    ...overrides,
  };
}

function createSessionLog(overrides: Record<string, unknown> = {}) {
  return {
    id: 'log-id',
    clientId: 'client-id',
    assignmentId: 'assignment-id',
    trainingSessionId: 'session-monday',
    scheduledDate: new Date(Date.UTC(2026, 4, 18)),
    status: ClientSessionStatus.completed,
    snapshotData: null,
    openedAt: new Date('2026-05-18T15:00:00.000Z'),
    completedAt: new Date('2026-05-18T16:00:00.000Z'),
    createdAt: new Date('2026-05-18T15:00:00.000Z'),
    updatedAt: new Date('2026-05-18T16:00:00.000Z'),
    ...overrides,
  };
}

describe('ClientPortalService', () => {
  let prismaService: PrismaServiceMock;
  let getCurrentStreak: ReturnType<typeof vi.fn>;
  let streakService: ClientStreakService;
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
      client: {
        findUnique: vi.fn().mockResolvedValue(createClient()),
      },
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
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      clientSessionLog: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      clientTrainingPlanAssignment: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      $transaction: vi.fn().mockImplementation(
        async (callback: (transaction: PrismaServiceMock) => Promise<unknown>) =>
          callback(prismaService),
      ),
    };
    getCurrentStreak = vi.fn().mockResolvedValue(6);
    streakService = {
      getCurrentStreak,
    } as unknown as ClientStreakService;
    service = new ClientPortalService(
      prismaService as unknown as PrismaService,
      streakService,
    );
  });

  it('keeps an active organization token available for PIN verification', async () => {
    await expect(service.getTokenStatus('plain-token')).resolves.toMatchObject({
      valid: true,
      requiresPin: true,
    });
  });

  it('hides a suspended organization as an unavailable token', async () => {
    prismaService.clientAccess.findUnique.mockResolvedValueOnce(
      createAccess({
        client: {
          ...createAccess().client,
          organization: {
            id: 'org-id',
            status: OrganizationStatus.suspended,
          },
        },
      }),
    );

    await expect(service.getTokenStatus('plain-token')).resolves.toEqual({
      valid: false,
      requiresPin: false,
    });
  });

  it('does not create a portal session when the organization is suspended', async () => {
    prismaService.clientAccess.findUnique.mockResolvedValueOnce(
      createAccess({
        client: {
          ...createAccess().client,
          organization: {
            id: 'org-id',
            status: OrganizationStatus.suspended,
          },
        },
      }),
    );

    await expect(
      service.verifyPin('plain-token', { pin: '123456' }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ message: 'Invalid credentials' }),
    });
    expect(prismaService.clientAccess.update).not.toHaveBeenCalled();
    expect(prismaService.clientPortalSession.create).not.toHaveBeenCalled();
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
    prismaService.clientAccess.findUnique.mockResolvedValue(
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

  it('does not create a session when the organization is suspended during PIN verification', async () => {
    prismaService.clientAccess.findUnique
      .mockResolvedValueOnce(createAccess({ pinHash: validPinHash }))
      .mockResolvedValueOnce(createAccess({
        pinHash: validPinHash,
        client: {
          ...createAccess().client,
          organization: {
            id: 'org-id',
            status: OrganizationStatus.suspended,
          },
        },
      }));

    await expect(
      service.verifyPin('plain-token', { pin: '123456' }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ message: 'Invalid credentials' }),
    });
    expect(prismaService.clientPortalSession.create).not.toHaveBeenCalled();
  });

  it('rejects a PIN when its hash changes before session emission', async () => {
    prismaService.clientAccess.findUnique
      .mockResolvedValueOnce(createAccess({ pinHash: validPinHash }))
      .mockResolvedValueOnce(createAccess({ pinHash: `${validPinHash}-rotated` }));

    await expect(
      service.verifyPin('plain-token', { pin: '123456' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prismaService.clientPortalSession.create).not.toHaveBeenCalled();
  });

  it('rejects a PIN when access is disabled before session emission', async () => {
    prismaService.clientAccess.findUnique
      .mockResolvedValueOnce(createAccess({ pinHash: validPinHash }))
      .mockResolvedValueOnce(createAccess({
        pinHash: validPinHash,
        status: ClientAccessStatus.disabled,
      }));

    await expect(
      service.verifyPin('plain-token', { pin: '123456' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prismaService.clientPortalSession.create).not.toHaveBeenCalled();
  });

  it('rejects a PIN with 429 when a temporary lock appears before session emission', async () => {
    const lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
    prismaService.clientAccess.findUnique
      .mockResolvedValueOnce(createAccess({ pinHash: validPinHash }))
      .mockResolvedValueOnce(createAccess({
        pinHash: validPinHash,
        status: ClientAccessStatus.temporarily_locked,
        lockedUntil,
      }));

    await expect(
      service.verifyPin('plain-token', { pin: '123456' }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        message: 'Too many failed PIN attempts',
        retryAfter: expect.any(Number),
        lockedUntil,
      }),
    });
    expect(prismaService.clientAccess.update).not.toHaveBeenCalled();
    expect(prismaService.clientPortalSession.create).not.toHaveBeenCalled();
  });

  it('does not create a session when a retry finds a temporary lock', async () => {
    const lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
    prismaService.clientAccess.findUnique
      .mockResolvedValueOnce(createAccess({ pinHash: validPinHash }))
      .mockResolvedValueOnce(createAccess({
        pinHash: validPinHash,
        status: ClientAccessStatus.temporarily_locked,
        lockedUntil,
      }));
    prismaService.$transaction.mockRejectedValueOnce({ code: 'P2034' });

    await expect(
      service.verifyPin('plain-token', { pin: '123456' }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ message: 'Too many failed PIN attempts' }),
    });
    expect(prismaService.$transaction).toHaveBeenCalledTimes(2);
    expect(prismaService.clientPortalSession.create).not.toHaveBeenCalled();
  });

  it('normalizes an expired temporary lock inside the emission transaction', async () => {
    const expiredAt = new Date(Date.now() - 15 * 60 * 1000);
    prismaService.clientAccess.findUnique
      .mockResolvedValueOnce(createAccess({ pinHash: validPinHash }))
      .mockResolvedValueOnce(createAccess({
        pinHash: validPinHash,
        status: ClientAccessStatus.temporarily_locked,
        lockedUntil: expiredAt,
        failedAttempts: 5,
      }));

    const result = await service.verifyPin('plain-token', { pin: '123456' });

    expect(result.success).toBe(true);
    expect(prismaService.clientAccess.update).toHaveBeenCalledWith({
      where: { id: 'access-id' },
      data: {
        failedAttempts: 0,
        lockedUntil: null,
        status: ClientAccessStatus.active,
        lastAccessAt: expect.any(Date),
      },
    });
    expect(prismaService.clientPortalSession.create).toHaveBeenCalledTimes(1);
  });

  it('retries the complete session emission after a serializable conflict', async () => {
    prismaService.clientAccess.findUnique.mockResolvedValue(
      createAccess({ pinHash: validPinHash }),
    );
    prismaService.$transaction.mockRejectedValueOnce({ code: 'P2034' });

    const result = await service.verifyPin('plain-token', { pin: '123456' });

    expect(result.sessionToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(prismaService.$transaction).toHaveBeenCalledTimes(2);
    expect(prismaService.clientPortalSession.create).toHaveBeenCalledTimes(1);
  });

  it('invalidates an existing portal session on logout', async () => {
    await service.logout('session-token');

    expect(prismaService.clientPortalSession.updateMany).toHaveBeenCalledWith({
      where: {
        sessionTokenHash: hashToken('session-token'),
        invalidated: false,
      },
      data: { invalidated: true },
    });
  });

  it('treats logout without cookie as idempotent', async () => {
    await service.logout(undefined);

    expect(prismaService.clientPortalSession.updateMany).not.toHaveBeenCalled();
  });

  it('returns no_plan when the client has no assignments', async () => {
    const result = await service.getCalendar(createAccess(), { date: '2026-05-20' });

    expect(result.state).toBe('no_plan');
    expect(result.assignment).toBeNull();
    expect(result.calendar).toBeNull();
    expect(prismaService.clientSessionLog.findMany).not.toHaveBeenCalled();
  });

  it('calculates the current plan week from the assignment start date', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-20T18:00:00.000Z'));
    prismaService.clientTrainingPlanAssignment.findFirst.mockResolvedValueOnce(createAssignment());

    try {
      const result = await service.getCalendar(createAccess(), { date: '2026-05-20' });

      expect(result.state).toBe('active');
      expect(result.calendar).toMatchObject({
        referenceDate: '2026-05-20',
        today: '2026-05-20',
        weekNumber: 1,
        weekStartDate: '2026-05-18',
        weekEndDate: '2026-05-24',
      });
      expect(result.calendar?.days).toHaveLength(7);
      expect(prismaService.clientSessionLog.findMany).toHaveBeenCalledWith({
        where: {
          clientId: 'client-id',
          assignmentId: 'assignment-id',
          scheduledDate: {
            gte: new Date(Date.UTC(2026, 4, 18)),
            lte: new Date(Date.UTC(2026, 4, 24)),
          },
        },
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('marks days without a session as no_session', async () => {
    prismaService.clientTrainingPlanAssignment.findFirst.mockResolvedValueOnce(createAssignment());

    const result = await service.getCalendar(createAccess(), { date: '2026-05-20' });
    const tuesday = result.calendar?.days.find((day) => day.dayOfWeek === DayOfWeek.tuesday);

    expect(tuesday).toMatchObject({
      date: '2026-05-19',
      status: 'no_session',
      canOpen: false,
      session: null,
      log: null,
    });
  });

  it('marks today sessions without logs as pending and openable', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-20T18:00:00.000Z'));
    prismaService.clientTrainingPlanAssignment.findFirst.mockResolvedValueOnce(createAssignment());

    try {
      const result = await service.getCalendar(createAccess(), { date: '2026-05-20' });
      const wednesday = result.calendar?.days.find(
        (day) => day.dayOfWeek === DayOfWeek.wednesday,
      );

      expect(wednesday).toMatchObject({
        date: '2026-05-20',
        status: 'pending',
        canOpen: true,
        session: {
          id: 'session-wednesday',
          name: 'wednesday session',
        },
        log: null,
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('marks future sessions without logs as pending but not openable', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-20T18:00:00.000Z'));
    prismaService.clientTrainingPlanAssignment.findFirst.mockResolvedValueOnce(createAssignment());

    try {
      const result = await service.getCalendar(createAccess(), { date: '2026-05-20' });
      const friday = result.calendar?.days.find((day) => day.dayOfWeek === DayOfWeek.friday);

      expect(friday).toMatchObject({
        date: '2026-05-22',
        status: 'pending',
        canOpen: false,
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps calendar dates aligned when the assignment starts mid-week', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-30T18:00:00.000Z'));
    prismaService.clientTrainingPlanAssignment.findFirst.mockResolvedValueOnce(
      createAssignment({
        startDate: new Date('2026-05-29T00:00:00.000Z'),
        assignedPlan: {
          id: 'assigned-plan-id',
          name: 'Assigned Plan',
          durationWeeks: 4,
          weeks: [
            {
              id: 'week-1',
              trainingPlanId: 'assigned-plan-id',
              weekNumber: 1,
              notes: null,
              createdAt: new Date('2026-01-01T00:00:00.000Z'),
              updatedAt: new Date('2026-01-01T00:00:00.000Z'),
              days: [
                createPlanDay(DayOfWeek.friday, 5, createSession(DayOfWeek.friday)),
                createPlanDay(DayOfWeek.saturday, 6, createSession(DayOfWeek.saturday)),
              ],
            },
          ],
        },
      }),
    );

    try {
      const result = await service.getCalendar(createAccess(), { date: '2026-05-30' });

      expect(result.calendar).toMatchObject({
        weekNumber: 1,
        weekStartDate: '2026-05-29',
        weekEndDate: '2026-06-04',
      });
      expect(result.calendar?.days.slice(0, 3)).toMatchObject([
        {
          date: '2026-05-29',
          dayOfWeek: DayOfWeek.friday,
          session: { id: 'session-friday' },
        },
        {
          date: '2026-05-30',
          dayOfWeek: DayOfWeek.saturday,
          session: { id: 'session-saturday' },
        },
        {
          date: '2026-05-31',
          dayOfWeek: DayOfWeek.sunday,
          session: null,
        },
      ]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('uses query date only as reference date while comparing statuses against real today', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-20T18:00:00.000Z'));
    prismaService.clientTrainingPlanAssignment.findFirst.mockResolvedValueOnce(
      createAssignment({
        assignedPlan: {
          id: 'assigned-plan-id',
          name: 'Assigned Plan',
          durationWeeks: 4,
          weeks: [
            {
              id: 'week-2',
              trainingPlanId: 'assigned-plan-id',
              weekNumber: 2,
              notes: null,
              createdAt: new Date('2026-01-01T00:00:00.000Z'),
              updatedAt: new Date('2026-01-01T00:00:00.000Z'),
              days: [
                createPlanDay(DayOfWeek.monday, 1, createSession(DayOfWeek.monday)),
                createPlanDay(DayOfWeek.wednesday, 3, createSession(DayOfWeek.wednesday)),
              ],
            },
          ],
        },
      }),
    );

    try {
      const result = await service.getCalendar(createAccess(), { date: '2026-05-27' });
      const monday = result.calendar?.days.find((day) => day.dayOfWeek === DayOfWeek.monday);
      const wednesday = result.calendar?.days.find(
        (day) => day.dayOfWeek === DayOfWeek.wednesday,
      );

      expect(result.calendar).toMatchObject({
        referenceDate: '2026-05-27',
        today: '2026-05-20',
        weekNumber: 2,
        weekStartDate: '2026-05-25',
        weekEndDate: '2026-05-31',
      });
      expect(monday).toMatchObject({
        date: '2026-05-25',
        status: 'pending',
        canOpen: false,
      });
      expect(wednesday).toMatchObject({
        date: '2026-05-27',
        status: 'pending',
        canOpen: false,
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('marks past sessions without logs as overdue and openable', async () => {
    prismaService.clientTrainingPlanAssignment.findFirst.mockResolvedValueOnce(createAssignment());

    const result = await service.getCalendar(createAccess(), { date: '2026-05-20' });
    const monday = result.calendar?.days.find((day) => day.dayOfWeek === DayOfWeek.monday);

    expect(monday).toMatchObject({
      date: '2026-05-18',
      status: 'overdue',
      canOpen: true,
    });
  });

  it('uses completed logs and prevents reopening completed sessions', async () => {
    prismaService.clientTrainingPlanAssignment.findFirst.mockResolvedValueOnce(createAssignment());
    prismaService.clientSessionLog.findMany.mockResolvedValueOnce([createSessionLog()]);

    const result = await service.getCalendar(createAccess(), { date: '2026-05-20' });
    const monday = result.calendar?.days.find((day) => day.dayOfWeek === DayOfWeek.monday);

    expect(monday).toMatchObject({
      date: '2026-05-18',
      status: ClientSessionStatus.completed,
      canOpen: false,
      log: {
        id: 'log-id',
        status: ClientSessionStatus.completed,
      },
    });
  });

  it('returns plan_finished when there is no active assignment but a finished one exists', async () => {
    prismaService.clientTrainingPlanAssignment.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(
        createAssignment({
          status: ClientTrainingPlanAssignmentStatus.finished,
          endedAt: new Date('2026-05-25T00:00:00.000Z'),
        }),
      );

    const result = await service.getCalendar(createAccess(), { date: '2026-05-29' });

    expect(result.state).toBe('plan_finished');
    expect(result.calendar).toBeNull();
    expect(result.assignment).toMatchObject({
      id: 'assignment-id',
      status: ClientTrainingPlanAssignmentStatus.finished,
    });
    expect(prismaService.clientSessionLog.findMany).not.toHaveBeenCalled();
  });

  it('returns a controlled home state when the client has no plan', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-29T18:00:00.000Z'));

    try {
      const result = await service.getHome(createAccess(), 'plain-token');

      expect(result).toMatchObject({
        state: 'no_plan',
        client: { id: 'client-id', name: 'Client One' },
        currentPlan: null,
        week: null,
        todaySession: null,
        nextPendingSession: null,
        latestSession: null,
        calendarLink: {
          href: '/client-portal/plain-token/calendar',
          query: { date: '2026-05-29' },
        },
        streak: {
          current: 0,
        },
      });
      expect(prismaService.clientSessionLog.findMany).not.toHaveBeenCalled();
      expect(getCurrentStreak).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('returns the current plan and week summary for an active home', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-20T18:00:00.000Z'));
    prismaService.clientTrainingPlanAssignment.findFirst
      .mockResolvedValueOnce(createAssignment())
      .mockResolvedValueOnce(createAssignment());

    try {
      const result = await service.getHome(createAccess(), 'plain-token');

      expect(result).toMatchObject({
        state: 'active',
        currentPlan: {
          assignmentId: 'assignment-id',
          status: ClientTrainingPlanAssignmentStatus.active,
          id: 'assigned-plan-id',
          name: 'Assigned Plan',
          durationWeeks: 4,
        },
        week: {
          weekNumber: 1,
          weekStartDate: '2026-05-18',
          weekEndDate: '2026-05-24',
          summary: {
            totalTrainingSessions: 3,
            completedSessions: 0,
            pendingSessions: 3,
            openedSessions: 0,
            restDays: 4,
          },
        },
        streak: {
          current: 6,
        },
      });
      expect(getCurrentStreak).toHaveBeenCalledWith({
        anchorDate: '2026-05-20',
        assignment: createAssignment(),
        clientId: 'client-id',
      });
      expect(result.week?.days).toHaveLength(7);
      expect(result.week?.days.slice(0, 3)).toMatchObject([
        {
          date: '2026-05-18',
          dayOfWeek: DayOfWeek.monday,
          status: 'overdue',
          canOpen: true,
          session: {
            id: 'session-monday',
            name: 'monday session',
          },
          log: null,
        },
        {
          date: '2026-05-19',
          dayOfWeek: DayOfWeek.tuesday,
          status: 'no_session',
          canOpen: false,
          session: null,
          log: null,
        },
        {
          date: '2026-05-20',
          dayOfWeek: DayOfWeek.wednesday,
          status: 'pending',
          canOpen: true,
          session: {
            id: 'session-wednesday',
          },
        },
      ]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('returns home week days in assignment order when the week starts away from monday', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-30T18:00:00.000Z'));
    const assignment = createAssignment({
      startDate: new Date('2026-05-29T00:00:00.000Z'),
      assignedPlan: {
        id: 'assigned-plan-id',
        name: 'Assigned Plan',
        durationWeeks: 4,
        weeks: [
          {
            id: 'week-1',
            trainingPlanId: 'assigned-plan-id',
            weekNumber: 1,
            notes: null,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            days: [
              createPlanDay(DayOfWeek.friday, 5, createSession(DayOfWeek.friday)),
              createPlanDay(DayOfWeek.saturday, 6, createSession(DayOfWeek.saturday)),
            ],
          },
        ],
      },
    });
    prismaService.clientTrainingPlanAssignment.findFirst
      .mockResolvedValueOnce(assignment)
      .mockResolvedValueOnce(assignment);

    try {
      const result = await service.getHome(createAccess(), 'plain-token');

      expect(result.week?.days).toHaveLength(7);
      expect(result.week?.days.map((day) => day.dayOfWeek)).toEqual([
        DayOfWeek.friday,
        DayOfWeek.saturday,
        DayOfWeek.sunday,
        DayOfWeek.monday,
        DayOfWeek.tuesday,
        DayOfWeek.wednesday,
        DayOfWeek.thursday,
      ]);
      expect(result.week?.days.slice(0, 3)).toMatchObject([
        {
          date: '2026-05-29',
          session: { id: 'session-friday' },
        },
        {
          date: '2026-05-30',
          session: { id: 'session-saturday' },
        },
        {
          date: '2026-05-31',
          status: 'no_session',
          session: null,
        },
      ]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('returns today pending session when today has no log yet', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-20T18:00:00.000Z'));
    prismaService.clientTrainingPlanAssignment.findFirst
      .mockResolvedValueOnce(createAssignment())
      .mockResolvedValueOnce(createAssignment());

    try {
      const result = await service.getHome(createAccess(), 'plain-token');

      expect(result.todaySession).toMatchObject({
        date: '2026-05-20',
        status: 'pending',
        canOpen: true,
        session: {
          id: 'session-wednesday',
          name: 'wednesday session',
        },
        log: null,
      });
      expect(result.nextPendingSession).toMatchObject({
        date: '2026-05-20',
        status: 'pending',
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('reflects today opened session and latest session on home', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-20T18:00:00.000Z'));
    prismaService.clientTrainingPlanAssignment.findFirst
      .mockResolvedValueOnce(createAssignment())
      .mockResolvedValueOnce(createAssignment());
    prismaService.clientSessionLog.findMany.mockResolvedValueOnce([
      createSessionLog({
        id: 'today-log-id',
        trainingSessionId: 'session-wednesday',
        scheduledDate: new Date(Date.UTC(2026, 4, 20)),
        status: ClientSessionStatus.opened,
        openedAt: new Date('2026-05-20T15:00:00.000Z'),
        completedAt: null,
      }),
    ]);

    try {
      const result = await service.getHome(createAccess(), 'plain-token');

      expect(result.todaySession).toMatchObject({
        date: '2026-05-20',
        status: ClientSessionStatus.opened,
        log: {
          id: 'today-log-id',
          status: ClientSessionStatus.opened,
        },
      });
      expect(result.latestSession).toMatchObject({
        date: '2026-05-20',
        status: ClientSessionStatus.opened,
        log: {
          id: 'today-log-id',
        },
      });
      expect(result.week?.summary.openedSessions).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('returns a controlled home state when the plan has finished', async () => {
    prismaService.clientTrainingPlanAssignment.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(
        createAssignment({
          status: ClientTrainingPlanAssignmentStatus.finished,
          endedAt: new Date('2026-05-25T00:00:00.000Z'),
        }),
      );

    const result = await service.getHome(createAccess(), 'plain-token');

    expect(result).toMatchObject({
      state: 'plan_finished',
      currentPlan: {
        assignmentId: 'assignment-id',
        status: ClientTrainingPlanAssignmentStatus.finished,
        id: 'assigned-plan-id',
        name: 'Assigned Plan',
      },
      week: null,
      todaySession: null,
      nextPendingSession: null,
      latestSession: null,
    });
  });

  it('rejects invalid reference dates', async () => {
    await expect(
      service.getCalendar(createAccess(), { date: '2026-5-20' }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prismaService.client.findUnique).not.toHaveBeenCalled();
  });
});
