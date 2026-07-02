import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Equipment, ExerciseMediaType, PrimaryMuscle } from 'db';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../common/prisma/prisma.service';
import { ClientSessionSnapshotService } from './client-session-snapshot.service';

type PrismaServiceMock = {
  clientSessionLog: {
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
  };
  trainingSession: {
    findFirst: ReturnType<typeof vi.fn>;
  };
};

function createExercise(overrides: Record<string, unknown> = {}) {
  return {
    id: 'exercise-1',
    organizationId: 'org-id',
    createdByUserId: 'user-id',
    name: 'Back Squat',
    primaryMuscle: PrimaryMuscle.legs,
    secondaryMuscles: [PrimaryMuscle.glute],
    equipment: Equipment.barbell,
    instructions: 'Brace and squat.',
    recommendations: 'Keep neutral spine.',
    mediaUrl: 'https://cdn.example.com/squat.mp4',
    mediaType: ExerciseMediaType.video_url,
    videoUrl: 'https://video.example.com/squat',
    status: 'active',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function createSession(overrides: Record<string, unknown> = {}) {
  return {
    id: 'session-1',
    trainingPlanDayId: 'day-1',
    name: 'Lower Body',
    description: 'Heavy lower session',
    coachNote: 'Warm up well',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    exercises: [
      {
        id: 'session-exercise-2',
        trainingSessionId: 'session-1',
        exerciseId: 'exercise-2',
        orderIndex: 2,
        sets: 3,
        reps: '12',
        restSeconds: 60,
        coachNote: 'Controlled tempo',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        exercise: createExercise({
          id: 'exercise-2',
          name: 'Romanian Deadlift',
          primaryMuscle: PrimaryMuscle.legs,
          secondaryMuscles: [PrimaryMuscle.glute],
          equipment: Equipment.dumbbell,
          instructions: null,
          recommendations: null,
          mediaUrl: null,
          mediaType: null,
        }),
        alternatives: [
          {
            id: 'alternative-b',
            sessionExerciseId: 'session-exercise-2',
            alternativeExerciseId: 'exercise-4',
            note: 'Use if lower back is tired',
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            alternativeExercise: createExercise({
              id: 'exercise-4',
              name: 'Hamstring Curl',
              primaryMuscle: PrimaryMuscle.legs,
              secondaryMuscles: [],
              equipment: Equipment.machine,
              mediaType: null,
            }),
          },
        ],
      },
      {
        id: 'session-exercise-1',
        trainingSessionId: 'session-1',
        exerciseId: 'exercise-1',
        orderIndex: 1,
        sets: 5,
        reps: '5',
        restSeconds: 180,
        coachNote: 'Leave one rep in reserve',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        exercise: createExercise(),
        alternatives: [
          {
            id: 'alternative-c',
            sessionExerciseId: 'session-exercise-1',
            alternativeExerciseId: 'exercise-3',
            note: null,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            alternativeExercise: createExercise({
              id: 'exercise-3',
              name: 'Goblet Squat',
              equipment: Equipment.dumbbell,
            }),
          },
          {
            id: 'alternative-a',
            sessionExerciseId: 'session-exercise-1',
            alternativeExerciseId: 'exercise-5',
            note: 'Knee-friendly option',
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            alternativeExercise: createExercise({
              id: 'exercise-5',
              name: 'Leg Press',
              equipment: Equipment.machine,
            }),
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe('ClientSessionSnapshotService', () => {
  let prismaService: PrismaServiceMock;
  let service: ClientSessionSnapshotService;

  beforeEach(() => {
    prismaService = {
      clientSessionLog: {
        create: vi.fn(),
        update: vi.fn(),
        upsert: vi.fn(),
      },
      trainingSession: {
        findFirst: vi.fn().mockResolvedValue(createSession()),
      },
    };
    service = new ClientSessionSnapshotService(prismaService as unknown as PrismaService);
  });

  it('builds a complete V1 snapshot from the current training session', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-20T18:00:00.000Z'));

    try {
      const snapshot = await service.buildSnapshotForSession('session-1');

      expect(prismaService.trainingSession.findFirst).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        include: {
          exercises: {
            orderBy: { orderIndex: 'asc' },
            include: {
              exercise: true,
              alternatives: {
                orderBy: { id: 'asc' },
                include: { alternativeExercise: true },
              },
            },
          },
        },
      });
      expect(snapshot).toMatchObject({
        version: 1,
        capturedAt: '2026-05-20T18:00:00.000Z',
        session: {
          id: 'session-1',
          name: 'Lower Body',
          description: 'Heavy lower session',
          coachNote: 'Warm up well',
        },
      });
      expect(snapshot.exercises.map((exercise) => exercise.sessionExerciseId)).toEqual([
        'session-exercise-1',
        'session-exercise-2',
      ]);
      expect(snapshot.exercises[0]).toMatchObject({
        sessionExerciseId: 'session-exercise-1',
        exerciseId: 'exercise-1',
        orderIndex: 1,
        sets: 5,
        reps: '5',
        restSeconds: 180,
        coachNote: 'Leave one rep in reserve',
        exercise: {
          id: 'exercise-1',
          name: 'Back Squat',
          primaryMuscle: PrimaryMuscle.legs,
          secondaryMuscles: [PrimaryMuscle.glute],
          equipment: Equipment.barbell,
          instructions: 'Brace and squat.',
          recommendations: 'Keep neutral spine.',
          mediaUrl: 'https://cdn.example.com/squat.mp4',
          mediaType: ExerciseMediaType.video_url,
          videoUrl: 'https://video.example.com/squat',
        },
      });
      expect(snapshot.exercises[0]?.alternatives.map((alternative) => alternative.id)).toEqual([
        'alternative-a',
        'alternative-c',
      ]);
      expect(snapshot.exercises[0]?.alternatives[0]).toMatchObject({
        id: 'alternative-a',
        alternativeExerciseId: 'exercise-5',
        note: 'Knee-friendly option',
        exercise: {
          id: 'exercise-5',
          name: 'Leg Press',
          equipment: Equipment.machine,
        },
      });
      expect(prismaService.clientSessionLog.create).not.toHaveBeenCalled();
      expect(prismaService.clientSessionLog.update).not.toHaveBeenCalled();
      expect(prismaService.clientSessionLog.upsert).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps the snapshot stable when the original session object is later mutated', async () => {
    const session = createSession();
    prismaService.trainingSession.findFirst.mockResolvedValueOnce(session);

    const snapshot = await service.buildSnapshotForSession('session-1');
    session.name = 'Edited Session';
    session.exercises[0].reps = '99';
    session.exercises[0].exercise.name = 'Edited Exercise';
    session.exercises[1].alternatives[0].alternativeExercise.name = 'Edited Alternative';

    expect(snapshot.session.name).toBe('Lower Body');
    expect(snapshot.exercises[1]?.reps).toBe('12');
    expect(snapshot.exercises[1]?.exercise.name).toBe('Romanian Deadlift');
    expect(snapshot.exercises[0]?.alternatives[1]?.exercise.name).toBe('Goblet Squat');
  });

  it('parses a valid stored snapshot', async () => {
    const snapshot = await service.buildSnapshotForSession('session-1');

    expect(service.parseSnapshotData(snapshot)).toEqual(snapshot);
    expect(service.isSnapshotV1(snapshot)).toBe(true);
  });

  it('rejects malformed snapshots and unsupported versions', () => {
    expect(() => service.parseSnapshotData(null)).toThrow(BadRequestException);
    expect(() => service.parseSnapshotData({ version: 2 })).toThrow(BadRequestException);
    expect(() =>
      service.parseSnapshotData({
        version: 1,
        capturedAt: '2026-05-20T18:00:00.000Z',
        session: { id: 'session-1', name: 'Session', description: null, coachNote: null },
        exercises: [{ sessionExerciseId: 'bad' }],
      }),
    ).toThrow(BadRequestException);
    expect(service.isSnapshotV1({ version: 2 })).toBe(false);
  });

  it('throws when the source session cannot be found', async () => {
    prismaService.trainingSession.findFirst.mockResolvedValueOnce(null);

    await expect(service.buildSnapshotForSession('missing-session')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
