/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  ClientSessionStatus,
  ClientTrainingPlanAssignmentStatus,
  DayOfWeek,
  TrainingDayType,
} from 'db';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../common/prisma/prisma.service';
import {
  ClientStreakService,
  type ClientStreakAssignment,
} from './client-streak.service';

type PrismaServiceMock = {
  clientSessionLog: {
    findMany: ReturnType<typeof vi.fn>;
  };
};

function createAssignment(
  overrides: Partial<ClientStreakAssignment> = {},
): ClientStreakAssignment {
  return {
    id: 'assignment-id',
    clientId: 'client-id',
    sourceTrainingPlanId: 'template-plan-id',
    assignedPlanId: 'assigned-plan-id',
    assignedByMemberId: 'member-id',
    startDate: new Date('2026-07-06T06:00:00.000Z'),
    endedAt: null,
    status: ClientTrainingPlanAssignmentStatus.active,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    assignedPlan: {
      durationWeeks: 2,
      weeks: [
        {
          weekNumber: 1,
          days: [
            trainingDay(DayOfWeek.monday, 'session-a'),
            restDay(DayOfWeek.tuesday),
            trainingDay(DayOfWeek.wednesday, 'session-b'),
            restDay(DayOfWeek.thursday),
            trainingDay(DayOfWeek.friday, 'session-c'),
          ],
        },
        {
          weekNumber: 2,
          days: [
            trainingDay(DayOfWeek.monday, 'session-a'),
            restDay(DayOfWeek.tuesday),
            trainingDay(DayOfWeek.wednesday, 'session-b'),
            restDay(DayOfWeek.thursday),
            trainingDay(DayOfWeek.friday, 'session-c'),
          ],
        },
      ],
    },
    ...overrides,
  };
}

function trainingDay(dayOfWeek: DayOfWeek, sessionId: string) {
  return {
    dayOfWeek,
    dayType: TrainingDayType.training,
    session: { id: sessionId },
  };
}

function restDay(dayOfWeek: DayOfWeek) {
  return {
    dayOfWeek,
    dayType: TrainingDayType.rest,
    session: null,
  };
}

function createLog({
  assignmentId = 'assignment-id',
  date,
  sessionId,
  status = ClientSessionStatus.completed,
}: {
  assignmentId?: string;
  date: string;
  sessionId: string;
  status?: ClientSessionStatus;
}) {
  return {
    id: `${assignmentId}-${sessionId}-${date}`,
    clientId: 'client-id',
    assignmentId,
    trainingSessionId: sessionId,
    scheduledDate: toScheduledDate(date),
    status,
    snapshotData: null,
    openedAt: new Date(`${date}T15:00:00.000Z`),
    completedAt: status === ClientSessionStatus.completed
      ? new Date(`${date}T16:00:00.000Z`)
      : null,
    createdAt: new Date(`${date}T15:00:00.000Z`),
    updatedAt: new Date(`${date}T16:00:00.000Z`),
  };
}

function toScheduledDate(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);

  return new Date(Date.UTC(year, month - 1, day));
}

describe('ClientStreakService', () => {
  let prismaService: PrismaServiceMock;
  let service: ClientStreakService;

  beforeEach(() => {
    prismaService = {
      clientSessionLog: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };
    service = new ClientStreakService(prismaService as unknown as PrismaService);
  });

  it('counts completed sessions across week boundaries', async () => {
    prismaService.clientSessionLog.findMany.mockResolvedValueOnce([
      createLog({ date: '2026-07-06', sessionId: 'session-a' }),
      createLog({ date: '2026-07-08', sessionId: 'session-b' }),
      createLog({ date: '2026-07-10', sessionId: 'session-c' }),
      createLog({ date: '2026-07-13', sessionId: 'session-a' }),
      createLog({ date: '2026-07-15', sessionId: 'session-b' }),
      createLog({ date: '2026-07-17', sessionId: 'session-c' }),
    ]);

    await expect(getStreak(service, '2026-07-17')).resolves.toBe(6);
  });

  it('skips rest days between completed sessions', async () => {
    prismaService.clientSessionLog.findMany.mockResolvedValueOnce([
      createLog({ date: '2026-07-06', sessionId: 'session-a' }),
      createLog({ date: '2026-07-08', sessionId: 'session-b' }),
    ]);

    await expect(getStreak(service, '2026-07-09')).resolves.toBe(2);
  });

  it('breaks when a past scheduled session has no log', async () => {
    prismaService.clientSessionLog.findMany.mockResolvedValueOnce([
      createLog({ date: '2026-07-06', sessionId: 'session-a' }),
      createLog({ date: '2026-07-10', sessionId: 'session-c' }),
    ]);

    await expect(getStreak(service, '2026-07-10')).resolves.toBe(1);
  });

  it('breaks when a past scheduled session was partially completed', async () => {
    prismaService.clientSessionLog.findMany.mockResolvedValueOnce([
      createLog({ date: '2026-07-06', sessionId: 'session-a' }),
      createLog({
        date: '2026-07-08',
        sessionId: 'session-b',
        status: ClientSessionStatus.partially_completed,
      }),
      createLog({ date: '2026-07-10', sessionId: 'session-c' }),
    ]);

    await expect(getStreak(service, '2026-07-10')).resolves.toBe(1);
  });

  it('breaks when a past scheduled session was opened or in progress', async () => {
    prismaService.clientSessionLog.findMany.mockResolvedValueOnce([
      createLog({ date: '2026-07-06', sessionId: 'session-a' }),
      createLog({
        date: '2026-07-08',
        sessionId: 'session-b',
        status: ClientSessionStatus.in_progress,
      }),
      createLog({ date: '2026-07-10', sessionId: 'session-c' }),
    ]);

    await expect(getStreak(service, '2026-07-10')).resolves.toBe(1);

    prismaService.clientSessionLog.findMany.mockResolvedValueOnce([
      createLog({ date: '2026-07-06', sessionId: 'session-a' }),
      createLog({
        date: '2026-07-08',
        sessionId: 'session-b',
        status: ClientSessionStatus.opened,
      }),
      createLog({ date: '2026-07-10', sessionId: 'session-c' }),
    ]);

    await expect(getStreak(service, '2026-07-10')).resolves.toBe(1);
  });

  it('keeps the streak when today is pending and previous sessions are completed', async () => {
    prismaService.clientSessionLog.findMany.mockResolvedValueOnce([
      createLog({ date: '2026-07-06', sessionId: 'session-a' }),
      createLog({ date: '2026-07-08', sessionId: 'session-b' }),
      createLog({ date: '2026-07-10', sessionId: 'session-c' }),
    ]);

    await expect(getStreak(service, '2026-07-13')).resolves.toBe(3);
  });

  it('breaks when a missed session happened after the latest completed session', async () => {
    prismaService.clientSessionLog.findMany.mockResolvedValueOnce([
      createLog({ date: '2026-07-06', sessionId: 'session-a' }),
      createLog({ date: '2026-07-08', sessionId: 'session-b' }),
    ]);

    await expect(getStreak(service, '2026-07-13')).resolves.toBe(0);
  });

  it('breaks when a past partial session happened after the latest completed session', async () => {
    prismaService.clientSessionLog.findMany.mockResolvedValueOnce([
      createLog({ date: '2026-07-06', sessionId: 'session-a' }),
      createLog({
        date: '2026-07-08',
        sessionId: 'session-b',
        status: ClientSessionStatus.partially_completed,
      }),
    ]);

    await expect(getStreak(service, '2026-07-13')).resolves.toBe(0);
  });

  it('breaks when yesterday was in progress and today is rest', async () => {
    prismaService.clientSessionLog.findMany.mockResolvedValueOnce([
      createLog({ date: '2026-07-06', sessionId: 'session-a' }),
      createLog({
        date: '2026-07-08',
        sessionId: 'session-b',
        status: ClientSessionStatus.in_progress,
      }),
    ]);

    await expect(getStreak(service, '2026-07-09')).resolves.toBe(0);
  });

  it('keeps the streak when today is in progress and previous sessions are completed', async () => {
    prismaService.clientSessionLog.findMany.mockResolvedValueOnce([
      createLog({ date: '2026-07-06', sessionId: 'session-a' }),
      createLog({ date: '2026-07-08', sessionId: 'session-b' }),
      createLog({ date: '2026-07-10', sessionId: 'session-c' }),
      createLog({
        date: '2026-07-13',
        sessionId: 'session-a',
        status: ClientSessionStatus.in_progress,
      }),
    ]);

    await expect(getStreak(service, '2026-07-13')).resolves.toBe(3);
  });

  it('includes today when today is completed', async () => {
    prismaService.clientSessionLog.findMany.mockResolvedValueOnce([
      createLog({ date: '2026-07-06', sessionId: 'session-a' }),
      createLog({ date: '2026-07-08', sessionId: 'session-b' }),
      createLog({ date: '2026-07-10', sessionId: 'session-c' }),
      createLog({ date: '2026-07-13', sessionId: 'session-a' }),
    ]);

    await expect(getStreak(service, '2026-07-13')).resolves.toBe(4);
  });

  it('breaks when today is partially completed', async () => {
    prismaService.clientSessionLog.findMany.mockResolvedValueOnce([
      createLog({ date: '2026-07-06', sessionId: 'session-a' }),
      createLog({ date: '2026-07-08', sessionId: 'session-b' }),
      createLog({ date: '2026-07-10', sessionId: 'session-c' }),
      createLog({
        date: '2026-07-13',
        sessionId: 'session-a',
        status: ClientSessionStatus.partially_completed,
      }),
    ]);

    await expect(getStreak(service, '2026-07-13')).resolves.toBe(0);
  });

  it('starts a new streak after a missed session is followed by a completed session', async () => {
    prismaService.clientSessionLog.findMany.mockResolvedValueOnce([
      createLog({ date: '2026-07-06', sessionId: 'session-a' }),
      createLog({ date: '2026-07-10', sessionId: 'session-c' }),
    ]);

    await expect(getStreak(service, '2026-07-10')).resolves.toBe(1);
  });

  it('ignores future sessions and logs', async () => {
    prismaService.clientSessionLog.findMany.mockResolvedValueOnce([
      createLog({ date: '2026-07-06', sessionId: 'session-a' }),
      createLog({ date: '2026-07-08', sessionId: 'session-b' }),
      createLog({ date: '2026-07-10', sessionId: 'session-c' }),
      createLog({ date: '2026-07-13', sessionId: 'session-a' }),
    ]);

    await expect(getStreak(service, '2026-07-10')).resolves.toBe(3);
  });

  it('does not include logs from a previous assignment', async () => {
    prismaService.clientSessionLog.findMany.mockResolvedValueOnce([
      createLog({
        assignmentId: 'previous-assignment-id',
        date: '2026-07-06',
        sessionId: 'session-a',
      }),
      createLog({ date: '2026-07-08', sessionId: 'session-b' }),
    ]);

    await expect(getStreak(service, '2026-07-08')).resolves.toBe(1);
    expect(prismaService.clientSessionLog.findMany).toHaveBeenCalledWith({
      where: {
        assignmentId: 'assignment-id',
        clientId: 'client-id',
        scheduledDate: {
          gte: toScheduledDate('2026-07-06'),
          lte: toScheduledDate('2026-07-08'),
        },
      },
    });
  });
});

function getStreak(service: ClientStreakService, anchorDate: string) {
  return service.getCurrentStreak({
    anchorDate,
    assignment: createAssignment(),
    clientId: 'client-id',
  });
}
