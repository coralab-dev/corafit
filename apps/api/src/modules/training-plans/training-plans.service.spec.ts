/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  DayOfWeek,
  TrainingDayType,
  TrainingPlanStatus,
  TrainingPlanType,
  OrganizationMemberRole,
  type OrganizationMember,
} from 'db';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../common/prisma/prisma.service';
import { TrainingPlansService } from './training-plans.service';

type PrismaServiceMock = {
  $transaction: ReturnType<typeof vi.fn>;
  trainingPlan: {
    count: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
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
    delete: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  sessionExerciseAlternative: {
    count: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  exercise: {
    count: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
  };
  systemSetting: {
    findUnique: ReturnType<typeof vi.fn>;
  };
};

function createMockPrisma(): PrismaServiceMock {
  const mock = {
    $transaction: vi.fn(),
    trainingPlan: {
      count: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    trainingPlanWeek: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
    trainingPlanDay: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
    trainingSession: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    sessionExercise: {
      create: vi.fn(),
      delete: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    sessionExerciseAlternative: {
      count: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    exercise: {
      count: vi.fn(),
      findFirst: vi.fn(),
    },
    systemSetting: {
      findUnique: vi.fn(),
    },
  };

  mock.$transaction.mockImplementation(async (arg: unknown) => {
    if (typeof arg === 'function') {
      const cb = arg as (prisma: PrismaService) => Promise<unknown>;
      return cb(mock);
    }
    return Promise.all(arg as Promise<unknown>[]);
  });

  return mock;
}

const mockMember: OrganizationMember = {
  id: 'member-1',
  organizationId: 'org-1',
  userId: 'user-1',
  role: OrganizationMemberRole.owner,
  status: 'active' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('TrainingPlansService', () => {
  let service: TrainingPlansService;
  let prisma: PrismaServiceMock;

  beforeEach(() => {
    prisma = createMockPrisma();
    service = new TrainingPlansService(prisma as unknown as PrismaService);
  });

  describe('quickCreate', () => {
    it('creates plan with weeks, days, sessions and exercises', async () => {
      prisma.exercise.count.mockResolvedValue(2);
      prisma.trainingPlan.create.mockResolvedValue({ id: 'plan-1' });
      prisma.trainingPlanWeek.create.mockResolvedValue({ id: 'week-1' });
      prisma.trainingPlanDay.create.mockResolvedValue({ id: 'day-1' });
      prisma.trainingSession.create.mockResolvedValue({ id: 'session-1' });
      prisma.sessionExercise.create.mockResolvedValue({ id: 'ex-1' });

      const result = await service.quickCreate(
        {
          name: 'Plan Test',
          weeks: 2,
          daysPerWeek: [1, 3, 5],
          exercises: ['ex-1', 'ex-2'],
        },
        mockMember,
      );

      expect(result).toEqual({ id: 'plan-1' });
      expect(prisma.exercise.count).toHaveBeenCalledWith({
        where: {
          id: { in: ['ex-1', 'ex-2'] },
          OR: [{ organizationId: null }, { organizationId: 'org-1' }],
        },
      });
      expect(prisma.trainingPlan.create).toHaveBeenCalled();
      expect(prisma.trainingPlanWeek.create).toHaveBeenCalledTimes(2);
      expect(prisma.trainingPlanDay.create).toHaveBeenCalledTimes(6); // 2 weeks * 3 days
      expect(prisma.trainingSession.create).toHaveBeenCalledTimes(6);
      expect(prisma.sessionExercise.create).toHaveBeenCalledTimes(12); // 6 sessions * 2 exercises
    });

    it('rejects weeks out of range', async () => {
      await expect(
        service.quickCreate(
          {
            name: 'Plan Test',
            weeks: 0,
            daysPerWeek: [1],
            exercises: ['ex-1'],
          },
          mockMember,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects weeks over 12', async () => {
      await expect(
        service.quickCreate(
          {
            name: 'Plan Test',
            weeks: 13,
            daysPerWeek: [1],
            exercises: ['ex-1'],
          },
          mockMember,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects duplicate days', async () => {
      await expect(
        service.quickCreate(
          {
            name: 'Plan Test',
            weeks: 1,
            daysPerWeek: [1, 1],
            exercises: ['ex-1'],
          },
          mockMember,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects days out of range', async () => {
      await expect(
        service.quickCreate(
          {
            name: 'Plan Test',
            weeks: 1,
            daysPerWeek: [8],
            exercises: ['ex-1'],
          },
          mockMember,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects empty exercises', async () => {
      await expect(
        service.quickCreate(
          {
            name: 'Plan Test',
            weeks: 1,
            daysPerWeek: [1],
            exercises: [],
          },
          mockMember,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects exercises not visible to org', async () => {
      prisma.exercise.count.mockResolvedValue(0);

      await expect(
        service.quickCreate(
          {
            name: 'Plan Test',
            weeks: 1,
            daysPerWeek: [1],
            exercises: ['ex-1'],
          },
          mockMember,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('requires organization member', async () => {
      await expect(
        service.quickCreate(
          {
            name: 'Plan Test',
            weeks: 1,
            daysPerWeek: [1],
            exercises: ['ex-1'],
          },
          undefined,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('createManual', () => {
    it('creates empty plan with template/draft', async () => {
      prisma.trainingPlan.create.mockResolvedValue({ id: 'plan-1' });

      const result = await service.createManual(
        {
          name: 'Manual Plan',
          durationWeeks: 4,
        },
        mockMember,
      );

      expect(result).toEqual({ id: 'plan-1' });
      expect(prisma.trainingPlan.create).toHaveBeenCalledWith({
        data: {
          name: 'Manual Plan',
          goal: null,
          level: null,
          durationWeeks: 4,
          generalNotes: null,
          status: TrainingPlanStatus.draft,
          planType: TrainingPlanType.template,
          organizationId: 'org-1',
          createdByMemberId: 'member-1',
        },
      });
    });

    it('rejects invalid durationWeeks', async () => {
      await expect(
        service.createManual(
          {
            name: 'Plan',
            durationWeeks: 0,
          },
          mockMember,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('COR-25 editor mutations', () => {
    it('updates editable plan fields after organization ownership check', async () => {
      prisma.trainingPlan.findFirst.mockResolvedValue({
        id: 'plan-1',
        durationWeeks: 4,
      });
      prisma.trainingPlanWeek.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ weekNumber: 4 });
      prisma.trainingPlan.update.mockResolvedValue({ id: 'plan-1', name: 'Nuevo' });

      const result = await service.updatePlan(
        'plan-1',
        { name: ' Nuevo ', durationWeeks: 6, level: 'intermediate' },
        mockMember,
      );

      expect(result).toEqual({ id: 'plan-1', name: 'Nuevo' });
      expect(prisma.trainingPlan.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'plan-1',
          organizationId: 'org-1',
          planType: TrainingPlanType.template,
        },
      });
      expect(prisma.trainingPlan.update).toHaveBeenCalledWith({
        where: { id: 'plan-1' },
        data: { durationWeeks: 6, level: 'intermediate', name: 'Nuevo' },
      });
      expect(prisma.trainingPlanWeek.create).toHaveBeenCalledTimes(2);
      expect(prisma.trainingPlanWeek.create).toHaveBeenNthCalledWith(1, {
        data: { trainingPlanId: 'plan-1', weekNumber: 5 },
      });
      expect(prisma.trainingPlanWeek.create).toHaveBeenNthCalledWith(2, {
        data: { trainingPlanId: 'plan-1', weekNumber: 6 },
      });
    });

    it('rejects reducing durationWeeks when weeks exist outside the new range', async () => {
      prisma.trainingPlan.findFirst.mockResolvedValue({
        id: 'plan-1',
        durationWeeks: 4,
      });
      prisma.trainingPlanWeek.findFirst.mockResolvedValue({ id: 'week-3' });

      await expect(
        service.updatePlan('plan-1', { durationWeeks: 2 }, mockMember),
      ).rejects.toThrow(ConflictException);
      expect(prisma.trainingPlan.update).not.toHaveBeenCalled();
    });

    it('rejects unsupported plan levels', async () => {
      prisma.trainingPlan.findFirst.mockResolvedValue({
        id: 'plan-1',
        durationWeeks: 4,
      });

      await expect(
        service.updatePlan('plan-1', { level: 'expert' }, mockMember),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.trainingPlan.update).not.toHaveBeenCalled();
    });

    it('adds an exercise to a visible session with validated prescription fields', async () => {
      prisma.trainingSession.findFirst.mockResolvedValue({ id: 'session-1' });
      prisma.exercise.findFirst.mockResolvedValue({ id: 'ex-1' });
      prisma.sessionExercise.findFirst.mockResolvedValue({ orderIndex: 2 });
      prisma.sessionExercise.create.mockResolvedValue({ id: 'se-1' });

      await service.createSessionExercise(
        'session-1',
        {
          exerciseId: 'ex-1',
          reps: '10-12',
          restSeconds: 90,
          sets: 3,
        },
        mockMember,
      );

      expect(prisma.sessionExercise.create).toHaveBeenCalledWith({
        data: {
          coachNote: null,
          exerciseId: 'ex-1',
          orderIndex: 3,
          reps: '10-12',
          restSeconds: 90,
          sets: 3,
          trainingSessionId: 'session-1',
        },
      });
    });

    it('duplicates a session exercise with alternatives into the next order slot', async () => {
      prisma.sessionExercise.findFirst.mockResolvedValueOnce({
        id: 'se-1',
        trainingSessionId: 'session-1',
        exerciseId: 'ex-1',
        orderIndex: 1,
        sets: 3,
        reps: '8',
        restSeconds: 120,
        coachNote: 'control',
        alternatives: [{ alternativeExerciseId: 'ex-2', note: 'si duele' }],
      });
      prisma.sessionExercise.findFirst.mockResolvedValueOnce({ orderIndex: 4 });
      prisma.sessionExercise.create.mockResolvedValue({ id: 'se-copy' });
      prisma.sessionExerciseAlternative.create.mockResolvedValue({ id: 'alt-copy' });

      await service.duplicateSessionExercise('se-1', mockMember);

      expect(prisma.sessionExercise.create).toHaveBeenCalledWith({
        data: {
          coachNote: 'control',
          exerciseId: 'ex-1',
          orderIndex: 5,
          reps: '8',
          restSeconds: 120,
          sets: 3,
          trainingSessionId: 'session-1',
        },
      });
      expect(prisma.sessionExerciseAlternative.create).toHaveBeenCalledWith({
        data: {
          alternativeExerciseId: 'ex-2',
          note: 'si duele',
          sessionExerciseId: 'se-copy',
        },
      });
    });

    it('reorders exercises only when all items belong to the same visible session', async () => {
      prisma.sessionExercise.findMany.mockResolvedValue([
        { id: 'se-1', trainingSessionId: 'session-1' },
        { id: 'se-2', trainingSessionId: 'session-1' },
      ]);
      prisma.sessionExercise.update.mockResolvedValue({});

      await service.reorderSessionExercises(
        {
          items: [
            { sessionExerciseId: 'se-2', orderIndex: 0 },
            { sessionExerciseId: 'se-1', orderIndex: 1 },
          ],
        },
        mockMember,
      );

      expect(prisma.sessionExercise.update).toHaveBeenCalledTimes(4);
    });

    it('rejects a fourth alternative for the same session exercise', async () => {
      prisma.sessionExercise.findFirst.mockResolvedValue({ id: 'se-1', alternatives: [] });
      prisma.exercise.findFirst.mockResolvedValue({ id: 'ex-2' });
      prisma.sessionExerciseAlternative.count.mockResolvedValue(3);

      await expect(
        service.createAlternative(
          'se-1',
          { alternativeExerciseId: 'ex-2' },
          mockMember,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('list', () => {
    it('returns paginated plans for organization', async () => {
      prisma.trainingPlan.findMany.mockResolvedValue([{ id: 'plan-1' }]);
      prisma.trainingPlan.count.mockResolvedValue(1);
      prisma.systemSetting.findUnique.mockResolvedValue(null);

      const result = await service.list({}, mockMember);

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(prisma.trainingPlan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            organizationId: 'org-1',
            planType: TrainingPlanType.template,
          },
        }),
      );
    });

    it.each([
      ['draft', TrainingPlanStatus.draft],
      ['active', TrainingPlanStatus.active],
      ['archived', TrainingPlanStatus.archived],
    ])('filters by %s status', async (status, expectedStatus) => {
      prisma.trainingPlan.findMany.mockResolvedValue([]);
      prisma.trainingPlan.count.mockResolvedValue(0);
      prisma.systemSetting.findUnique.mockResolvedValue(null);

      await service.list({ status }, mockMember);

      expect(prisma.trainingPlan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            organizationId: 'org-1',
            planType: TrainingPlanType.template,
            status: expectedStatus,
          },
        }),
      );
    });

    it('includes active templates from seed organization', async () => {
      prisma.systemSetting.findUnique.mockResolvedValue({
        value: 'seed-org-1',
      });
      prisma.trainingPlan.findMany.mockResolvedValue([
        { id: 'plan-1', organizationId: 'org-1' },
        { id: 'plan-seed', organizationId: 'seed-org-1' },
      ]);
      prisma.trainingPlan.count.mockResolvedValue(2);

      const result = await service.list({}, mockMember);

      expect(result.items).toHaveLength(2);
      expect(result.items[0].isSystemTemplate).toBe(false);
      expect(result.items[1].isSystemTemplate).toBe(true);
      expect(prisma.trainingPlan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            planType: TrainingPlanType.template,
            OR: [
              { organizationId: 'org-1' },
              {
                organizationId: 'seed-org-1',
                status: TrainingPlanStatus.active,
              },
            ],
          }),
        }),
      );
    });
  });

  describe('getById', () => {
    it('returns plan with full tree', async () => {
      prisma.trainingPlan.findFirst.mockResolvedValue({
        id: 'plan-1',
        organizationId: 'org-1',
        weeks: [],
      });
      prisma.systemSetting.findUnique.mockResolvedValue(null);

      const result = await service.getById('plan-1', mockMember);

      expect(result.id).toBe('plan-1');
      expect(result.isSystemTemplate).toBe(false);
      expect(prisma.trainingPlan.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'plan-1', organizationId: 'org-1', planType: TrainingPlanType.template },
          include: expect.objectContaining({
            weeks: expect.objectContaining({
              include: expect.objectContaining({
                days: expect.objectContaining({
                  include: expect.objectContaining({
                    session: expect.objectContaining({
                      include: expect.objectContaining({
                        exercises: expect.objectContaining({
                          include: expect.objectContaining({
                            exercise: true,
                            alternatives: expect.objectContaining({
                              include: expect.objectContaining({
                                alternativeExercise: true,
                              }),
                            }),
                          }),
                        }),
                      }),
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      );
    });

    it('throws NotFound for plan in another org', async () => {
      prisma.trainingPlan.findFirst.mockResolvedValue(null);
      prisma.systemSetting.findUnique.mockResolvedValue(null);

      await expect(service.getById('plan-1', mockMember)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('allows reading an active template from seed organization', async () => {
      prisma.systemSetting.findUnique.mockResolvedValue({
        value: 'seed-org-1',
      });
      prisma.trainingPlan.findFirst.mockResolvedValue({
        id: 'plan-seed',
        organizationId: 'seed-org-1',
        weeks: [],
      });

      const result = await service.getById('plan-seed', mockMember);

      expect(result.id).toBe('plan-seed');
      expect(result.isSystemTemplate).toBe(true);
      expect(prisma.trainingPlan.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'plan-seed',
            planType: TrainingPlanType.template,
            OR: [
              { organizationId: 'org-1' },
              {
                organizationId: 'seed-org-1',
                status: TrainingPlanStatus.active,
              },
            ],
          }),
        }),
      );
    });
  });

  describe('duplicate', () => {
    it('copies full hierarchy with new IDs', async () => {
      prisma.systemSetting.findUnique.mockResolvedValue(null);
      prisma.trainingPlan.findFirst.mockResolvedValue({
        id: 'orig-1',
        name: 'Original',
        goal: 'Strength',
        level: 'intermediate',
        durationWeeks: 4,
        generalNotes: null,
        weeks: [
          {
            id: 'week-1',
            weekNumber: 1,
            notes: null,
            days: [
              {
                id: 'day-1',
                dayOfWeek: DayOfWeek.monday,
                dayOrder: null,
                dayType: TrainingDayType.training,
                session: {
                  id: 'session-1',
                  name: 'Push',
                  description: null,
                  coachNote: null,
                  exercises: [
                    {
                      id: 'se-1',
                      exerciseId: 'ex-1',
                      orderIndex: 0,
                      sets: 3,
                      reps: '10-12',
                      restSeconds: 90,
                      coachNote: null,
                      alternatives: [
                        {
                          id: 'alt-1',
                          alternativeExerciseId: 'ex-2',
                          note: null,
                        },
                      ],
                    },
                  ],
                },
              },
            ],
          },
        ],
      });
      prisma.trainingPlan.create.mockResolvedValue({ id: 'copy-1' });
      prisma.trainingPlanWeek.create.mockResolvedValue({ id: 'week-copy-1' });
      prisma.trainingPlanDay.create.mockResolvedValue({ id: 'day-copy-1' });
      prisma.trainingSession.create.mockResolvedValue({ id: 'session-copy-1' });
      prisma.sessionExercise.create.mockResolvedValue({ id: 'se-copy-1' });
      prisma.sessionExerciseAlternative.create.mockResolvedValue({
        id: 'alt-copy-1',
      });

      const result = await service.duplicate(
        'orig-1',
        {},
        mockMember,
      );

      expect(result).toEqual({ id: 'copy-1' });
      expect(prisma.trainingPlan.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Original (copia)',
            sourcePlanId: 'orig-1',
            status: TrainingPlanStatus.draft,
            planType: TrainingPlanType.template,
            organizationId: 'org-1',
            createdByMemberId: 'member-1',
          }),
        }),
      );
      expect(prisma.trainingPlanWeek.create).toHaveBeenCalledTimes(1);
      expect(prisma.trainingPlanDay.create).toHaveBeenCalledTimes(1);
      expect(prisma.trainingSession.create).toHaveBeenCalledTimes(1);
      expect(prisma.sessionExercise.create).toHaveBeenCalledTimes(1);
      expect(prisma.sessionExerciseAlternative.create).toHaveBeenCalledTimes(1);
    });

    it('uses custom name when provided', async () => {
      prisma.systemSetting.findUnique.mockResolvedValue(null);
      prisma.trainingPlan.findFirst.mockResolvedValue({
        id: 'orig-1',
        name: 'Original',
        goal: null,
        level: null,
        durationWeeks: 1,
        generalNotes: null,
        weeks: [],
      });
      prisma.trainingPlan.create.mockResolvedValue({ id: 'copy-1' });

      await service.duplicate('orig-1', { name: 'Custom Name' }, mockMember);

      expect(prisma.trainingPlan.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Custom Name',
          }),
        }),
      );
    });

    it('throws NotFound for plan in another org', async () => {
      prisma.systemSetting.findUnique.mockResolvedValue(null);
      prisma.trainingPlan.findFirst.mockResolvedValue(null);

      await expect(
        service.duplicate('orig-1', {}, mockMember),
      ).rejects.toThrow(NotFoundException);
    });

    it('copies a seed template into the real organization', async () => {
      prisma.systemSetting.findUnique.mockResolvedValue({
        value: 'seed-org-1',
      });
      prisma.trainingPlan.findFirst.mockResolvedValue({
        id: 'seed-plan-1',
        name: 'Seed Plan',
        goal: 'Fitness',
        level: 'beginner',
        durationWeeks: 4,
        generalNotes: null,
        organizationId: 'seed-org-1',
        weeks: [],
      });
      prisma.trainingPlan.create.mockResolvedValue({ id: 'copy-1' });

      const result = await service.duplicate('seed-plan-1', {}, mockMember);

      expect(result).toEqual({ id: 'copy-1' });
      expect(prisma.trainingPlan.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Seed Plan (copia)',
            sourcePlanId: 'seed-plan-1',
            organizationId: 'org-1',
            createdByMemberId: 'member-1',
            status: TrainingPlanStatus.draft,
            planType: TrainingPlanType.template,
          }),
        }),
      );
    });

    it('rejects duplicating a plan from an unrelated organization', async () => {
      prisma.systemSetting.findUnique.mockResolvedValue({
        value: 'seed-org-1',
      });
      prisma.trainingPlan.findFirst.mockResolvedValue(null);

      await expect(
        service.duplicate('other-plan', {}, mockMember),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('duplicateWeek', () => {
    it('copies week with next weekNumber', async () => {
      prisma.trainingPlanWeek.findFirst.mockResolvedValue({
        id: 'week-1',
        weekNumber: 1,
        notes: null,
        days: [],
      });
      prisma.trainingPlanWeek.findFirst.mockResolvedValueOnce({
        id: 'week-1',
        weekNumber: 1,
        notes: null,
        days: [],
      });
      prisma.trainingPlanWeek.findFirst.mockResolvedValueOnce({
        id: 'week-max',
        weekNumber: 3,
      });
      prisma.trainingPlanWeek.create.mockResolvedValue({ id: 'week-copy-1' });

      const result = await service.duplicateWeek(
        'plan-1',
        'week-1',
        mockMember,
      );

      expect(result).toEqual({ id: 'week-copy-1' });
      expect(prisma.trainingPlanWeek.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            weekNumber: 4,
          }),
        }),
      );
    });

    it('throws NotFound for week in another org', async () => {
      prisma.trainingPlanWeek.findFirst.mockResolvedValue(null);

      await expect(
        service.duplicateWeek('plan-1', 'week-1', mockMember),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('copyDay', () => {
    it('copies day to target dayOfWeek', async () => {
      prisma.trainingPlanDay.findFirst.mockResolvedValue({
        id: 'day-1',
        trainingPlanWeekId: 'week-1',
        dayOfWeek: DayOfWeek.monday,
        dayOrder: null,
        dayType: TrainingDayType.training,
        session: null,
      });
      prisma.trainingPlanDay.findFirst.mockResolvedValueOnce({
        id: 'day-1',
        trainingPlanWeekId: 'week-1',
        dayOfWeek: DayOfWeek.monday,
        dayOrder: null,
        dayType: TrainingDayType.training,
        session: null,
      });
      prisma.trainingPlanDay.findFirst.mockResolvedValueOnce(null);
      prisma.trainingPlanDay.create.mockResolvedValue({ id: 'day-copy-1' });

      const result = await service.copyDay(
        'day-1',
        { dayOfWeek: 'wednesday' },
        mockMember,
      );

      expect(result).toEqual({ id: 'day-copy-1' });
      expect(prisma.trainingPlanDay.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            dayOfWeek: DayOfWeek.wednesday,
          }),
        }),
      );
    });

    it('throws Conflict if target day already exists', async () => {
      prisma.trainingPlanDay.findFirst.mockResolvedValue({
        id: 'day-1',
        trainingPlanWeekId: 'week-1',
        dayOfWeek: DayOfWeek.monday,
        dayOrder: null,
        dayType: TrainingDayType.training,
        session: null,
      });
      prisma.trainingPlanDay.findFirst.mockResolvedValueOnce({
        id: 'day-1',
        trainingPlanWeekId: 'week-1',
        dayOfWeek: DayOfWeek.monday,
        dayOrder: null,
        dayType: TrainingDayType.training,
        session: null,
      });
      prisma.trainingPlanDay.findFirst.mockResolvedValueOnce({
        id: 'day-existing',
      });

      await expect(
        service.copyDay('day-1', { dayOfWeek: 'wednesday' }, mockMember),
      ).rejects.toThrow(ConflictException);
    });

    it('throws NotFound for day in another org', async () => {
      prisma.trainingPlanDay.findFirst.mockResolvedValue(null);

      await expect(
        service.copyDay('day-1', { dayOfWeek: 'wednesday' }, mockMember),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
