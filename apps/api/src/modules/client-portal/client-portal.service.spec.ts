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
  TrainingDayType,
} from 'db';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../common/prisma/prisma.service';
import { ClientPortalService } from './client-portal.service';

type PrismaServiceMock = {
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
    client: { id: 'client-id', name: 'Client One' },
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
    prismaService.clientTrainingPlanAssignment.findFirst.mockResolvedValueOnce(createAssignment());

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
    prismaService.clientTrainingPlanAssignment.findFirst.mockResolvedValueOnce(createAssignment());

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
  });

  it('marks future sessions without logs as pending but not openable', async () => {
    prismaService.clientTrainingPlanAssignment.findFirst.mockResolvedValueOnce(createAssignment());

    const result = await service.getCalendar(createAccess(), { date: '2026-05-20' });
    const friday = result.calendar?.days.find((day) => day.dayOfWeek === DayOfWeek.friday);

    expect(friday).toMatchObject({
      date: '2026-05-22',
      status: 'pending',
      canOpen: false,
    });
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

  it('rejects invalid reference dates', async () => {
    await expect(
      service.getCalendar(createAccess(), { date: '2026-5-20' }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prismaService.client.findUnique).not.toHaveBeenCalled();
  });
});
