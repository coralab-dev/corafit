/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/unbound-method */
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  ClientSessionStatus,
  ClientTrainingPlanAssignmentStatus,
  DayOfWeek,
  TrainingDayType,
} from 'db';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../common/prisma/prisma.service';
import {
  ClientSessionSnapshotService,
  type ClientSessionSnapshotV1,
} from './client-session-snapshot.service';
import { ClientSessionLogsService } from './client-session-logs.service';

type PrismaServiceMock = {
  client: {
    findUnique: ReturnType<typeof vi.fn>;
  };
  clientSessionLog: {
    create: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  clientTrainingPlanAssignment: {
    findFirst: ReturnType<typeof vi.fn>;
  };
};

function createAccess() {
  return {
    id: 'access-id',
    clientId: 'client-id',
    tokenHash: 'hash',
    pinHash: null,
    status: 'active',
    failedAttempts: 0,
    lockedUntil: null,
    lastAccessAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    client: { id: 'client-id', name: 'Client One' },
  };
}

function createClient() {
  return {
    id: 'client-id',
    name: 'Client One',
    organization: { timezone: 'America/Mexico_City' },
  };
}

function createSnapshot(overrides: Partial<ClientSessionSnapshotV1> = {}): ClientSessionSnapshotV1 {
  return {
    version: 1,
    capturedAt: '2026-05-20T18:00:00.000Z',
    session: {
      id: 'session-1',
      name: 'Lower Body',
      description: 'Heavy lower session',
      coachNote: 'Warm up',
    },
    exercises: [
      {
        sessionExerciseId: 'session-exercise-1',
        exerciseId: 'exercise-1',
        orderIndex: 1,
        sets: 3,
        reps: '10',
        restSeconds: 90,
        coachNote: null,
        exercise: {
          id: 'exercise-1',
          name: 'Back Squat',
          primaryMuscle: 'legs',
          secondaryMuscles: ['glute'],
          equipment: 'barbell',
          instructions: null,
          recommendations: null,
          mediaUrl: null,
          mediaType: null,
        },
        alternatives: [
          {
            id: 'alternative-1',
            alternativeExerciseId: 'exercise-alt-1',
            note: 'Knee-friendly',
            exercise: {
              id: 'exercise-alt-1',
              name: 'Leg Press',
              primaryMuscle: 'legs',
              secondaryMuscles: [],
              equipment: 'machine',
              instructions: null,
              recommendations: null,
              mediaUrl: null,
              mediaType: null,
            },
          },
        ],
      },
      {
        sessionExerciseId: 'session-exercise-2',
        exerciseId: 'exercise-2',
        orderIndex: 2,
        sets: 4,
        reps: '12',
        restSeconds: 60,
        coachNote: 'Slow eccentric',
        exercise: {
          id: 'exercise-2',
          name: 'Romanian Deadlift',
          primaryMuscle: 'legs',
          secondaryMuscles: ['glute'],
          equipment: 'dumbbell',
          instructions: null,
          recommendations: null,
          mediaUrl: null,
          mediaType: null,
        },
        alternatives: [],
      },
    ],
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
          weekNumber: 1,
          days: [
            {
              dayOfWeek: DayOfWeek.wednesday,
              dayOrder: 3,
              dayType: TrainingDayType.training,
              session: {
                id: 'session-1',
                name: 'Lower Body',
                description: null,
                coachNote: null,
              },
            },
          ],
        },
      ],
    },
    ...overrides,
  };
}

function createLog(overrides: Record<string, unknown> = {}) {
  return {
    id: 'log-id',
    clientId: 'client-id',
    assignmentId: 'assignment-id',
    trainingSessionId: 'session-1',
    scheduledDate: new Date(Date.UTC(2026, 4, 20)),
    status: ClientSessionStatus.opened,
    snapshotData: createSnapshot(),
    openedAt: new Date('2026-05-20T18:00:00.000Z'),
    completedAt: null,
    createdAt: new Date('2026-05-20T18:00:00.000Z'),
    updatedAt: new Date('2026-05-20T18:00:00.000Z'),
    ...overrides,
  };
}

describe('ClientSessionLogsService', () => {
  let prismaService: PrismaServiceMock;
  let snapshotService: ClientSessionSnapshotService;
  let service: ClientSessionLogsService;

  beforeEach(() => {
    prismaService = {
      client: {
        findUnique: vi.fn().mockResolvedValue(createClient()),
      },
      clientSessionLog: {
        create: vi.fn().mockImplementation(({ data }) => Promise.resolve(createLog(data))),
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([]),
        update: vi.fn().mockImplementation(({ data }) => Promise.resolve(createLog(data))),
      },
      clientTrainingPlanAssignment: {
        findFirst: vi.fn().mockResolvedValue(createAssignment()),
      },
    };
    snapshotService = {
      buildSnapshotForSession: vi.fn().mockResolvedValue(createSnapshot()),
      parseSnapshotData: vi.fn((value: unknown) => value as ClientSessionSnapshotV1),
      isSnapshotV1: vi.fn(),
    } as unknown as ClientSessionSnapshotService;
    service = new ClientSessionLogsService(
      prismaService as unknown as PrismaService,
      snapshotService,
    );
  });

  it('open creates a log with snapshot for an openable scheduled session', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-20T18:00:00.000Z'));

    try {
      const result = await service.openSession(createAccess(), {
        trainingSessionId: 'session-1',
        scheduledDate: '2026-05-20',
      });

      expect(snapshotService.buildSnapshotForSession).toHaveBeenCalledWith('session-1');
      expect(prismaService.clientSessionLog.create).toHaveBeenCalledWith({
        data: {
          clientId: 'client-id',
          assignmentId: 'assignment-id',
          trainingSessionId: 'session-1',
          scheduledDate: new Date(Date.UTC(2026, 4, 20)),
          status: ClientSessionStatus.opened,
          snapshotData: createSnapshot(),
        },
      });
      expect(result.snapshotData).toMatchObject({ session: { name: 'Lower Body' } });
    } finally {
      vi.useRealTimers();
    }
  });

  it('open is idempotent and returns an existing log', async () => {
    const existingLog = createLog({ status: ClientSessionStatus.in_progress });
    prismaService.clientSessionLog.findFirst.mockResolvedValueOnce(existingLog);

    const result = await service.openSession(createAccess(), {
      trainingSessionId: 'session-1',
      scheduledDate: '2026-05-20',
    });

    expect(result.id).toBe('log-id');
    expect(prismaService.clientSessionLog.create).not.toHaveBeenCalled();
    expect(snapshotService.buildSnapshotForSession).not.toHaveBeenCalled();
  });

  it('open returns an existing log when concurrent creation hits the unique constraint', async () => {
    const existingLog = createLog({ status: ClientSessionStatus.opened });
    prismaService.clientSessionLog.create.mockRejectedValueOnce({ code: 'P2002' });
    prismaService.clientSessionLog.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(existingLog);

    const result = await service.openSession(createAccess(), {
      trainingSessionId: 'session-1',
      scheduledDate: '2026-05-20',
    });

    expect(result.id).toBe('log-id');
    expect(prismaService.clientSessionLog.findFirst).toHaveBeenLastCalledWith({
      where: {
        clientId: 'client-id',
        assignmentId: 'assignment-id',
        trainingSessionId: 'session-1',
        scheduledDate: new Date(Date.UTC(2026, 4, 20)),
      },
    });
  });

  it('does not allow opening a future session', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-20T18:00:00.000Z'));

    try {
      await expect(
        service.openSession(createAccess(), {
          trainingSessionId: 'session-1',
          scheduledDate: '2026-05-27',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prismaService.clientSessionLog.create).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('previews a scheduled session without creating a log', async () => {
    const result = await service.previewSession(createAccess(), {
      trainingSessionId: 'session-1',
      scheduledDate: '2026-05-20',
    });

    expect(snapshotService.buildSnapshotForSession).toHaveBeenCalledWith('session-1');
    expect(prismaService.clientSessionLog.create).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      trainingSessionId: 'session-1',
      scheduledDate: '2026-05-20',
      snapshotData: { session: { name: 'Lower Body' } },
    });
  });

  it('preview rejects sessions not scheduled for that date', async () => {
    await expect(
      service.previewSession(createAccess(), {
        trainingSessionId: 'other-session',
        scheduledDate: '2026-05-20',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(snapshotService.buildSnapshotForSession).not.toHaveBeenCalled();
  });

  it('does not allow accessing a log from another client', async () => {
    prismaService.clientSessionLog.findFirst.mockResolvedValueOnce(null);

    await expect(service.getSessionLog(createAccess(), 'other-log')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('complete exercise validates against snapshot and moves status to in_progress', async () => {
    prismaService.clientSessionLog.findFirst.mockResolvedValueOnce(createLog());

    const result = await service.completeExercise(createAccess(), 'log-id', {
      sessionExerciseId: 'session-exercise-1',
    });

    expect(prismaService.clientSessionLog.update).toHaveBeenCalledWith({
      where: { id: 'log-id' },
      data: {
        snapshotData: expect.objectContaining({
          progress: { completedExerciseIds: ['session-exercise-1'], usedAlternatives: [] },
        }),
        status: ClientSessionStatus.in_progress,
      },
    });
    expect(result.status).toBe(ClientSessionStatus.in_progress);

    prismaService.clientSessionLog.findFirst.mockResolvedValueOnce(createLog());
    await expect(
      service.completeExercise(createAccess(), 'log-id', { sessionExerciseId: 'missing' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('use alternative validates against snapshot', async () => {
    prismaService.clientSessionLog.findFirst.mockResolvedValueOnce(createLog());

    await service.useAlternative(createAccess(), 'log-id', {
      sessionExerciseId: 'session-exercise-1',
      alternativeId: 'alternative-1',
    });

    expect(prismaService.clientSessionLog.update).toHaveBeenCalledWith({
      where: { id: 'log-id' },
      data: {
        snapshotData: expect.objectContaining({
          progress: {
            completedExerciseIds: [],
            usedAlternatives: [
              {
                sessionExerciseId: 'session-exercise-1',
                alternativeId: 'alternative-1',
                alternativeExerciseId: 'exercise-alt-1',
              },
            ],
          },
        }),
        status: ClientSessionStatus.in_progress,
      },
    });

    prismaService.clientSessionLog.findFirst.mockResolvedValueOnce(createLog());
    await expect(
      service.useAlternative(createAccess(), 'log-id', {
        sessionExerciseId: 'session-exercise-1',
        alternativeId: 'missing',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('does not allow modifying completed or partially completed logs', async () => {
    prismaService.clientSessionLog.findFirst.mockResolvedValueOnce(
      createLog({ status: ClientSessionStatus.completed }),
    );

    await expect(
      service.completeExercise(createAccess(), 'log-id', {
        sessionExerciseId: 'session-exercise-1',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('finalize marks completed when all exercises are complete', async () => {
    prismaService.clientSessionLog.findFirst.mockResolvedValueOnce(
      createLog({
        snapshotData: {
          ...createSnapshot(),
          progress: {
            completedExerciseIds: ['session-exercise-1', 'session-exercise-2'],
            usedAlternatives: [],
          },
        },
      }),
    );

    const result = await service.finalizeSession(createAccess(), 'log-id');

    expect(prismaService.clientSessionLog.update).toHaveBeenCalledWith({
      where: { id: 'log-id' },
      data: {
        status: ClientSessionStatus.completed,
        completedAt: expect.any(Date),
      },
    });
    expect(result.status).toBe(ClientSessionStatus.completed);
  });

  it('finalize marks partially_completed when at least one exercise is complete', async () => {
    prismaService.clientSessionLog.findFirst.mockResolvedValueOnce(
      createLog({
        snapshotData: {
          ...createSnapshot(),
          progress: { completedExerciseIds: ['session-exercise-1'], usedAlternatives: [] },
        },
      }),
    );

    const result = await service.finalizeSession(createAccess(), 'log-id');

    expect(result.status).toBe(ClientSessionStatus.partially_completed);
  });

  it('does not finalize when no exercise is completed', async () => {
    prismaService.clientSessionLog.findFirst.mockResolvedValueOnce(createLog());

    await expect(service.finalizeSession(createAccess(), 'log-id')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('completion-card returns summary and assignment streak at the scheduled session', async () => {
    prismaService.clientSessionLog.findFirst.mockResolvedValueOnce(
      createLog({
        status: ClientSessionStatus.completed,
        snapshotData: {
          ...createSnapshot(),
          progress: {
            completedExerciseIds: ['session-exercise-1', 'session-exercise-2'],
            usedAlternatives: [],
          },
        },
      }),
    );
    prismaService.clientSessionLog.findMany.mockResolvedValueOnce([
      createLog({
        id: 'future-open-log',
        status: ClientSessionStatus.opened,
        scheduledDate: new Date(Date.UTC(2026, 4, 22)),
      }),
      createLog({
        id: 'previous-log',
        status: ClientSessionStatus.completed,
        scheduledDate: new Date(Date.UTC(2026, 4, 18)),
      }),
      createLog({
        id: 'current-log',
        status: ClientSessionStatus.completed,
        scheduledDate: new Date(Date.UTC(2026, 4, 20)),
      }),
      createLog({
        id: 'older-partial-log',
        status: ClientSessionStatus.partially_completed,
        scheduledDate: new Date(Date.UTC(2026, 4, 16)),
      }),
    ]);

    const result = await service.getCompletionCard(createAccess(), 'log-id');

    expect(prismaService.clientSessionLog.findMany).toHaveBeenCalledWith({
      where: {
        clientId: 'client-id',
        assignmentId: 'assignment-id',
        scheduledDate: {
          lte: new Date(Date.UTC(2026, 4, 20)),
        },
      },
      orderBy: { scheduledDate: 'desc' },
    });
    expect(result).toEqual({
      sessionName: 'Lower Body',
      scheduledDate: '2026-05-20',
      status: ClientSessionStatus.completed,
      completedExercises: 2,
      totalExercises: 2,
      completionPercentage: 100,
      streak: 2,
    });
  });

  it('uses snapshot data even if live plan data changes later', async () => {
    const snapshot = createSnapshot({ session: { ...createSnapshot().session, name: 'Frozen' } });
    prismaService.clientSessionLog.findFirst.mockResolvedValueOnce(
      createLog({ snapshotData: snapshot }),
    );

    const result = await service.getSessionLog(createAccess(), 'log-id');

    expect(result.snapshotData.session.name).toBe('Frozen');
    expect(prismaService.clientTrainingPlanAssignment.findFirst).not.toHaveBeenCalled();
  });
});
