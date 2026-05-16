import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DayOfWeek,
  TrainingDayType,
  TrainingPlanStatus,
  TrainingPlanType,
} from 'db';
import type { OrganizationMember } from 'db';
import { PrismaService } from '../../common/prisma/prisma.service';
import type {
  CopyDayDto,
  CreateSessionExerciseAlternativeDto,
  CreateSessionExerciseDto,
  CreatePlanDto,
  DuplicatePlanDto,
  ListPlansQuery,
  QuickCreatePlanDto,
  ReorderSessionExercisesDto,
  UpdatePlanDto,
  UpdateSessionDto,
  UpdateSessionExerciseAlternativeDto,
  UpdateSessionExerciseDto,
} from './dto/training-plan.dto';

const dayOfWeekMap: Record<number, DayOfWeek> = {
  1: DayOfWeek.monday,
  2: DayOfWeek.tuesday,
  3: DayOfWeek.wednesday,
  4: DayOfWeek.thursday,
  5: DayOfWeek.friday,
  6: DayOfWeek.saturday,
  7: DayOfWeek.sunday,
};

const dayOfWeekValues = Object.values(DayOfWeek);
const trainingLevelValues = ['beginner', 'intermediate', 'advanced'] as const;

@Injectable()
export class TrainingPlansService {
  constructor(private readonly prismaService: PrismaService) {}

  async list(query: ListPlansQuery, member: OrganizationMember | undefined) {
    if (!member) {
      throw new ForbiddenException('Organization membership is required');
    }

    const organizationId = member.organizationId;
    const page = this.parsePositiveInt(query.page, 1);
    const limit = Math.min(this.parsePositiveInt(query.limit, 20), 100);
    const search = query.search?.trim();
    const status = this.parseOptionalPlanStatus(query.status);
    const seedOrgId = await this.getSeedOrganizationId();

    const where: {
      planType: TrainingPlanType;
      status?: TrainingPlanStatus;
      name?: { contains: string; mode: 'insensitive' };
      OR?: Array<
        | { organizationId: string }
        | { organizationId: string; status: TrainingPlanStatus }
      >;
      organizationId?: string;
    } = {
      planType: TrainingPlanType.template,
      ...(status ? { status } : {}),
      ...(search
        ? {
            name: {
              contains: search,
              mode: 'insensitive' as const,
            },
          }
        : {}),
    };

    if (seedOrgId) {
      where.OR = [
        { organizationId },
        { organizationId: seedOrgId, status: TrainingPlanStatus.active },
      ];
    } else {
      where.organizationId = organizationId;
    }

    const [items, total] = await this.prismaService.$transaction([
      this.prismaService.trainingPlan.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prismaService.trainingPlan.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        ...item,
        isSystemTemplate: item.organizationId === seedOrgId,
      })),
      page,
      limit,
      total,
    };
  }

  async getById(planId: string, member: OrganizationMember | undefined) {
    if (!member) {
      throw new ForbiddenException('Organization membership is required');
    }

    const seedOrgId = await this.getSeedOrganizationId();

    const where: {
      id: string;
      planType: TrainingPlanType;
      organizationId?: string;
      OR?: Array<
        | { organizationId: string }
        | { organizationId: string; status: TrainingPlanStatus }
      >;
    } = {
      id: planId,
      planType: TrainingPlanType.template,
    };

    if (seedOrgId) {
      where.OR = [
        { organizationId: member.organizationId },
        { organizationId: seedOrgId, status: TrainingPlanStatus.active },
      ];
    } else {
      where.organizationId = member.organizationId;
    }

    const plan = await this.prismaService.trainingPlan.findFirst({
      where,
      include: {
        weeks: {
          orderBy: { weekNumber: 'asc' },
          include: {
            days: {
              orderBy: { dayOfWeek: 'asc' },
              include: {
                session: {
                  include: {
                    exercises: {
                      orderBy: { orderIndex: 'asc' },
                      include: {
                        exercise: true,
                        alternatives: {
                          include: {
                            alternativeExercise: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException('Training plan was not found');
    }

    return {
      ...plan,
      isSystemTemplate: plan.organizationId === seedOrgId,
    };
  }

  async quickCreate(
    body: QuickCreatePlanDto,
    member: OrganizationMember | undefined,
  ) {
    if (!member) {
      throw new ForbiddenException('Organization membership is required');
    }

    const data = this.parseQuickCreateData(body);
    const organizationId = member.organizationId;

    // Validate exercises exist and belong to org or are global
    const exerciseCount = await this.prismaService.exercise.count({
      where: {
        id: { in: data.exercises },
        OR: [{ organizationId: null }, { organizationId }],
      },
    });

    if (exerciseCount !== data.exercises.length) {
      throw new BadRequestException(
        'One or more exercises do not exist or are not accessible',
      );
    }

    return this.prismaService.$transaction(async (tx) => {
      const plan = await tx.trainingPlan.create({
        data: {
          name: data.name,
          goal: data.goal,
          level: data.level,
          durationWeeks: data.weeks,
          generalNotes: data.generalNotes,
          status: TrainingPlanStatus.draft,
          planType: TrainingPlanType.template,
          organizationId,
          createdByMemberId: member.id,
        },
      });

      for (let w = 1; w <= data.weeks; w++) {
        const week = await tx.trainingPlanWeek.create({
          data: {
            trainingPlanId: plan.id,
            weekNumber: w,
          },
        });

        for (const dayNum of data.daysPerWeek) {
          const day = await tx.trainingPlanDay.create({
            data: {
              trainingPlanWeekId: week.id,
              dayOfWeek: dayOfWeekMap[dayNum],
              dayType: TrainingDayType.training,
            },
          });

          const session = await tx.trainingSession.create({
            data: {
              trainingPlanDayId: day.id,
              name: `Sesión ${dayOfWeekMap[dayNum]}`,
            },
          });

          for (let i = 0; i < data.exercises.length; i++) {
            await tx.sessionExercise.create({
              data: {
                trainingSessionId: session.id,
                exerciseId: data.exercises[i],
                orderIndex: i,
                reps: '10-12',
              },
            });
          }
        }
      }

      return plan;
    });
  }

  async createManual(
    body: CreatePlanDto,
    member: OrganizationMember | undefined,
  ) {
    if (!member) {
      throw new ForbiddenException('Organization membership is required');
    }

    const name = this.parseString(body.name, 'name', true);
    const durationWeeks = this.parsePositiveInt(
      body.durationWeeks?.toString(),
      1,
    );

    if (durationWeeks < 1 || durationWeeks > 52) {
      throw new BadRequestException('durationWeeks must be between 1 and 52');
    }

    return this.prismaService.trainingPlan.create({
      data: {
        name,
        goal: this.parseOptionalString(body.goal, 'goal'),
        level: this.parseTrainingLevel(body.level),
        durationWeeks,
        generalNotes: this.parseOptionalString(body.generalNotes, 'generalNotes'),
        status: TrainingPlanStatus.draft,
        planType: TrainingPlanType.template,
        organizationId: member.organizationId,
        createdByMemberId: member.id,
      },
    });
  }

  async updatePlan(
    planId: string,
    body: UpdatePlanDto,
    member: OrganizationMember | undefined,
  ) {
    if (!member) {
      throw new ForbiddenException('Organization membership is required');
    }

    await this.ensurePlanVisible(planId, member.organizationId);
    const data = this.parsePlanUpdateData(body);

    if (!Object.keys(data).length) {
      throw new BadRequestException('At least one field is required');
    }

    return this.prismaService.$transaction(async (tx) => {
      if (data.durationWeeks !== undefined) {
        await this.syncPlanWeeks(tx, planId, data.durationWeeks);
      }

      return tx.trainingPlan.update({
        where: { id: planId },
        data,
      });
    });
  }

  async updateSession(
    sessionId: string,
    body: UpdateSessionDto,
    member: OrganizationMember | undefined,
  ) {
    if (!member) {
      throw new ForbiddenException('Organization membership is required');
    }

    await this.ensureSessionVisible(sessionId, member.organizationId);
    const data = this.parseSessionUpdateData(body);

    if (!Object.keys(data).length) {
      throw new BadRequestException('At least one field is required');
    }

    return this.prismaService.trainingSession.update({
      where: { id: sessionId },
      data,
    });
  }

  async createSessionExercise(
    sessionId: string,
    body: CreateSessionExerciseDto,
    member: OrganizationMember | undefined,
  ) {
    if (!member) {
      throw new ForbiddenException('Organization membership is required');
    }

    await this.ensureSessionVisible(sessionId, member.organizationId);
    await this.ensureExerciseVisible(body.exerciseId, member.organizationId);

    const maxExercise = await this.prismaService.sessionExercise.findFirst({
      where: { trainingSessionId: sessionId },
      orderBy: { orderIndex: 'desc' },
    });
    const orderIndex =
      body.orderIndex === undefined
        ? (maxExercise?.orderIndex ?? -1) + 1
        : this.parseNonNegativeInt(body.orderIndex, 'orderIndex');

    return this.prismaService.sessionExercise.create({
      data: {
        trainingSessionId: sessionId,
        exerciseId: body.exerciseId,
        orderIndex,
        sets: this.parseNullablePositiveInt(body.sets, 'sets'),
        reps: this.parseString(body.reps, 'reps', true),
        restSeconds: this.parseNullablePositiveInt(body.restSeconds, 'restSeconds'),
        coachNote: this.parseOptionalString(body.coachNote, 'coachNote'),
      },
    });
  }

  async updateSessionExercise(
    sessionExerciseId: string,
    body: UpdateSessionExerciseDto,
    member: OrganizationMember | undefined,
  ) {
    if (!member) {
      throw new ForbiddenException('Organization membership is required');
    }

    await this.ensureSessionExerciseVisible(sessionExerciseId, member.organizationId);
    if (body.exerciseId !== undefined) {
      await this.ensureExerciseVisible(body.exerciseId, member.organizationId);
    }

    const data = this.parseSessionExerciseUpdateData(body);
    if (!Object.keys(data).length) {
      throw new BadRequestException('At least one field is required');
    }

    return this.prismaService.sessionExercise.update({
      where: { id: sessionExerciseId },
      data,
    });
  }

  async deleteSessionExercise(
    sessionExerciseId: string,
    member: OrganizationMember | undefined,
  ) {
    if (!member) {
      throw new ForbiddenException('Organization membership is required');
    }

    await this.ensureSessionExerciseVisible(sessionExerciseId, member.organizationId);
    await this.prismaService.sessionExercise.delete({
      where: { id: sessionExerciseId },
    });

    return { deleted: true };
  }

  async duplicateSessionExercise(
    sessionExerciseId: string,
    member: OrganizationMember | undefined,
  ) {
    if (!member) {
      throw new ForbiddenException('Organization membership is required');
    }

    const original = await this.getSessionExerciseForOrganization(
      sessionExerciseId,
      member.organizationId,
    );
    const maxExercise = await this.prismaService.sessionExercise.findFirst({
      where: { trainingSessionId: original.trainingSessionId },
      orderBy: { orderIndex: 'desc' },
    });

    return this.prismaService.$transaction(async (tx) => {
      const duplicate = await tx.sessionExercise.create({
        data: {
          trainingSessionId: original.trainingSessionId,
          exerciseId: original.exerciseId,
          orderIndex: (maxExercise?.orderIndex ?? original.orderIndex) + 1,
          sets: original.sets,
          reps: original.reps,
          restSeconds: original.restSeconds,
          coachNote: original.coachNote,
        },
      });

      for (const alternative of original.alternatives) {
        await tx.sessionExerciseAlternative.create({
          data: {
            sessionExerciseId: duplicate.id,
            alternativeExerciseId: alternative.alternativeExerciseId,
            note: alternative.note,
          },
        });
      }

      return duplicate;
    });
  }

  async reorderSessionExercises(
    body: ReorderSessionExercisesDto,
    member: OrganizationMember | undefined,
  ) {
    if (!member) {
      throw new ForbiddenException('Organization membership is required');
    }

    if (!Array.isArray(body.items) || body.items.length === 0) {
      throw new BadRequestException('items must be a non-empty array');
    }

    const ids = body.items.map((item) =>
      this.parseString(item.sessionExerciseId, 'sessionExerciseId', true),
    );
    const uniqueIds = new Set(ids);
    if (uniqueIds.size !== ids.length) {
      throw new ConflictException('items contains duplicate sessionExerciseId values');
    }

    const orderIndexes = body.items.map((item) =>
      this.parseNonNegativeInt(item.orderIndex, 'orderIndex'),
    );
    if (new Set(orderIndexes).size !== orderIndexes.length) {
      throw new ConflictException('items contains duplicate orderIndex values');
    }

    const existing = await this.prismaService.sessionExercise.findMany({
      where: {
        id: { in: ids },
        session: this.sessionOrganizationWhere(member.organizationId),
      },
      select: { id: true, trainingSessionId: true },
    });

    if (existing.length !== ids.length) {
      throw new NotFoundException('One or more session exercises were not found');
    }

    const sessionIds = new Set(existing.map((item) => item.trainingSessionId));
    if (sessionIds.size !== 1) {
      throw new ConflictException('All exercises must belong to the same session');
    }

    return this.prismaService.$transaction(async (tx) => {
      for (let index = 0; index < ids.length; index++) {
        await tx.sessionExercise.update({
          where: { id: ids[index] },
          data: { orderIndex: -1 - index },
        });
      }

      for (const item of body.items) {
        await tx.sessionExercise.update({
          where: { id: item.sessionExerciseId },
          data: { orderIndex: item.orderIndex },
        });
      }

      return { reordered: true };
    });
  }

  async createAlternative(
    sessionExerciseId: string,
    body: CreateSessionExerciseAlternativeDto,
    member: OrganizationMember | undefined,
  ) {
    if (!member) {
      throw new ForbiddenException('Organization membership is required');
    }

    await this.ensureSessionExerciseVisible(sessionExerciseId, member.organizationId);
    await this.ensureExerciseVisible(body.alternativeExerciseId, member.organizationId);

    const alternativeCount = await this.prismaService.sessionExerciseAlternative.count({
      where: { sessionExerciseId },
    });

    if (alternativeCount >= 3) {
      throw new ConflictException('A session exercise can have up to 3 alternatives');
    }

    return this.prismaService.sessionExerciseAlternative.create({
      data: {
        sessionExerciseId,
        alternativeExerciseId: body.alternativeExerciseId,
        note: this.parseOptionalString(body.note, 'note'),
      },
    });
  }

  async updateAlternative(
    alternativeId: string,
    body: UpdateSessionExerciseAlternativeDto,
    member: OrganizationMember | undefined,
  ) {
    if (!member) {
      throw new ForbiddenException('Organization membership is required');
    }

    await this.ensureAlternativeVisible(alternativeId, member.organizationId);
    if (body.alternativeExerciseId !== undefined) {
      await this.ensureExerciseVisible(body.alternativeExerciseId, member.organizationId);
    }

    const data: { alternativeExerciseId?: string; note?: string | null } = {};
    if (body.alternativeExerciseId !== undefined) {
      data.alternativeExerciseId = body.alternativeExerciseId;
    }
    if (body.note !== undefined) {
      data.note = this.parseOptionalString(body.note, 'note');
    }

    if (!Object.keys(data).length) {
      throw new BadRequestException('At least one field is required');
    }

    return this.prismaService.sessionExerciseAlternative.update({
      where: { id: alternativeId },
      data,
    });
  }

  async deleteAlternative(
    alternativeId: string,
    member: OrganizationMember | undefined,
  ) {
    if (!member) {
      throw new ForbiddenException('Organization membership is required');
    }

    await this.ensureAlternativeVisible(alternativeId, member.organizationId);
    await this.prismaService.sessionExerciseAlternative.delete({
      where: { id: alternativeId },
    });

    return { deleted: true };
  }

  async duplicate(
    planId: string,
    body: DuplicatePlanDto,
    member: OrganizationMember | undefined,
  ) {
    if (!member) {
      throw new ForbiddenException('Organization membership is required');
    }

    const seedOrgId = await this.getSeedOrganizationId();

    const where: {
      id: string;
      planType: TrainingPlanType;
      organizationId?: string;
      OR?: Array<
        | { organizationId: string }
        | { organizationId: string; status: TrainingPlanStatus }
      >;
    } = {
      id: planId,
      planType: TrainingPlanType.template,
    };

    if (seedOrgId) {
      where.OR = [
        { organizationId: member.organizationId },
        { organizationId: seedOrgId, status: TrainingPlanStatus.active },
      ];
    } else {
      where.organizationId = member.organizationId;
    }

    const original = await this.prismaService.trainingPlan.findFirst({
      where,
      include: {
        weeks: {
          include: {
            days: {
              include: {
                session: {
                  include: {
                    exercises: {
                      include: {
                        alternatives: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!original) {
      throw new NotFoundException('Training plan was not found');
    }

    const newName = body.name?.trim() || `${original.name} (copia)`;

    return this.prismaService.$transaction(async (tx) => {
      const plan = await tx.trainingPlan.create({
        data: {
          name: newName,
          goal: original.goal,
          level: original.level,
          durationWeeks: original.durationWeeks,
          generalNotes: original.generalNotes,
          status: TrainingPlanStatus.draft,
          planType: TrainingPlanType.template,
          sourcePlanId: original.id,
          organizationId: member.organizationId,
          createdByMemberId: member.id,
        },
      });

      for (const originalWeek of original.weeks) {
        const week = await tx.trainingPlanWeek.create({
          data: {
            trainingPlanId: plan.id,
            weekNumber: originalWeek.weekNumber,
            notes: originalWeek.notes,
          },
        });

        for (const originalDay of originalWeek.days) {
          const day = await tx.trainingPlanDay.create({
            data: {
              trainingPlanWeekId: week.id,
              dayOfWeek: originalDay.dayOfWeek,
              dayOrder: originalDay.dayOrder,
              dayType: originalDay.dayType,
            },
          });

          if (originalDay.session) {
            const session = await tx.trainingSession.create({
              data: {
                trainingPlanDayId: day.id,
                name: originalDay.session.name,
                description: originalDay.session.description,
                coachNote: originalDay.session.coachNote,
              },
            });

            for (const originalExercise of originalDay.session.exercises) {
              const exercise = await tx.sessionExercise.create({
                data: {
                  trainingSessionId: session.id,
                  exerciseId: originalExercise.exerciseId,
                  orderIndex: originalExercise.orderIndex,
                  sets: originalExercise.sets,
                  reps: originalExercise.reps,
                  restSeconds: originalExercise.restSeconds,
                  coachNote: originalExercise.coachNote,
                },
              });

              for (const originalAlt of originalExercise.alternatives) {
                await tx.sessionExerciseAlternative.create({
                  data: {
                    sessionExerciseId: exercise.id,
                    alternativeExerciseId: originalAlt.alternativeExerciseId,
                    note: originalAlt.note,
                  },
                });
              }
            }
          }
        }
      }

      return plan;
    });
  }

  async duplicateWeek(
    planId: string,
    weekId: string,
    member: OrganizationMember | undefined,
  ) {
    if (!member) {
      throw new ForbiddenException('Organization membership is required');
    }

    const originalWeek = await this.prismaService.trainingPlanWeek.findFirst({
      where: {
        id: weekId,
        trainingPlan: {
          id: planId,
          organizationId: member.organizationId,
        },
      },
      include: {
        days: {
          include: {
            session: {
              include: {
                exercises: {
                  include: {
                    alternatives: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!originalWeek) {
      throw new NotFoundException('Week was not found');
    }

    const maxWeek = await this.prismaService.trainingPlanWeek.findFirst({
      where: { trainingPlanId: planId },
      orderBy: { weekNumber: 'desc' },
    });

    const nextWeekNumber = (maxWeek?.weekNumber ?? 0) + 1;

    return this.prismaService.$transaction(async (tx) => {
      const week = await tx.trainingPlanWeek.create({
        data: {
          trainingPlanId: planId,
          weekNumber: nextWeekNumber,
          notes: originalWeek.notes,
        },
      });

      for (const originalDay of originalWeek.days) {
        const day = await tx.trainingPlanDay.create({
          data: {
            trainingPlanWeekId: week.id,
            dayOfWeek: originalDay.dayOfWeek,
            dayOrder: originalDay.dayOrder,
            dayType: originalDay.dayType,
          },
        });

        if (originalDay.session) {
          const session = await tx.trainingSession.create({
            data: {
              trainingPlanDayId: day.id,
              name: originalDay.session.name,
              description: originalDay.session.description,
              coachNote: originalDay.session.coachNote,
            },
          });

          for (const originalExercise of originalDay.session.exercises) {
            const exercise = await tx.sessionExercise.create({
              data: {
                trainingSessionId: session.id,
                exerciseId: originalExercise.exerciseId,
                orderIndex: originalExercise.orderIndex,
                sets: originalExercise.sets,
                reps: originalExercise.reps,
                restSeconds: originalExercise.restSeconds,
                coachNote: originalExercise.coachNote,
              },
            });

            for (const originalAlt of originalExercise.alternatives) {
              await tx.sessionExerciseAlternative.create({
                data: {
                  sessionExerciseId: exercise.id,
                  alternativeExerciseId: originalAlt.alternativeExerciseId,
                  note: originalAlt.note,
                },
              });
            }
          }
        }
      }

      return week;
    });
  }

  async copyDay(
    dayId: string,
    body: CopyDayDto,
    member: OrganizationMember | undefined,
  ) {
    if (!member) {
      throw new ForbiddenException('Organization membership is required');
    }

    const targetDayOfWeek = this.parseDayOfWeek(body.dayOfWeek);

    const originalDay = await this.prismaService.trainingPlanDay.findFirst({
      where: {
        id: dayId,
        week: {
          trainingPlan: {
            organizationId: member.organizationId,
          },
        },
      },
      include: {
        session: {
          include: {
            exercises: {
              include: {
                alternatives: true,
              },
            },
          },
        },
      },
    });

    if (!originalDay) {
      throw new NotFoundException('Day was not found');
    }

    const existingDay = await this.prismaService.trainingPlanDay.findFirst({
      where: {
        trainingPlanWeekId: originalDay.trainingPlanWeekId,
        dayOfWeek: targetDayOfWeek,
      },
    });

    if (existingDay) {
      throw new ConflictException(
        'A day already exists for the target day of week',
      );
    }

    return this.prismaService.$transaction(async (tx) => {
      const day = await tx.trainingPlanDay.create({
        data: {
          trainingPlanWeekId: originalDay.trainingPlanWeekId,
          dayOfWeek: targetDayOfWeek,
          dayOrder: originalDay.dayOrder,
          dayType: originalDay.dayType,
        },
      });

      if (originalDay.session) {
        const session = await tx.trainingSession.create({
          data: {
            trainingPlanDayId: day.id,
            name: originalDay.session.name,
            description: originalDay.session.description,
            coachNote: originalDay.session.coachNote,
          },
        });

        for (const originalExercise of originalDay.session.exercises) {
          const exercise = await tx.sessionExercise.create({
            data: {
              trainingSessionId: session.id,
              exerciseId: originalExercise.exerciseId,
              orderIndex: originalExercise.orderIndex,
              sets: originalExercise.sets,
              reps: originalExercise.reps,
              restSeconds: originalExercise.restSeconds,
              coachNote: originalExercise.coachNote,
            },
          });

          for (const originalAlt of originalExercise.alternatives) {
            await tx.sessionExerciseAlternative.create({
              data: {
                sessionExerciseId: exercise.id,
                alternativeExerciseId: originalAlt.alternativeExerciseId,
                note: originalAlt.note,
              },
            });
          }
        }
      }

      return day;
    });
  }

  // --- private helpers ---

  private parseQuickCreateData(body: QuickCreatePlanDto) {
    const name = this.parseString(body.name, 'name', true);
    const weeks = this.parsePositiveInt(body.weeks?.toString(), 0);
    const daysPerWeek = body.daysPerWeek;
    const exercises = body.exercises;

    if (weeks < 1 || weeks > 12) {
      throw new BadRequestException('weeks must be between 1 and 12');
    }

    if (!Array.isArray(daysPerWeek) || daysPerWeek.length === 0) {
      throw new BadRequestException('daysPerWeek must be a non-empty array');
    }

    const uniqueDays = new Set(daysPerWeek);
    if (uniqueDays.size !== daysPerWeek.length) {
      throw new BadRequestException('daysPerWeek contains duplicate values');
    }

    for (const day of daysPerWeek) {
      if (day < 1 || day > 7) {
        throw new BadRequestException(
          'daysPerWeek values must be between 1 and 7',
        );
      }
    }

    if (!Array.isArray(exercises) || exercises.length === 0) {
      throw new BadRequestException('exercises must be a non-empty array');
    }

    return {
      name,
      weeks,
      daysPerWeek,
      exercises,
      goal: this.parseOptionalString(body.goal, 'goal'),
      level: this.parseTrainingLevel(body.level),
      generalNotes: this.parseOptionalString(body.generalNotes, 'generalNotes'),
    };
  }

  private async ensurePlanVisible(planId: string, organizationId: string) {
    const plan = await this.prismaService.trainingPlan.findFirst({
      where: { id: planId, organizationId, planType: TrainingPlanType.template },
    });

    if (!plan) {
      throw new NotFoundException('Training plan was not found');
    }

    return plan;
  }

  private async ensureSessionVisible(sessionId: string, organizationId: string) {
    const session = await this.prismaService.trainingSession.findFirst({
      where: {
        id: sessionId,
        day: {
          week: {
            trainingPlan: {
              organizationId,
              planType: TrainingPlanType.template,
            },
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Training session was not found');
    }

    return session;
  }

  private async ensureExerciseVisible(exerciseId: string, organizationId: string) {
    const exercise = await this.prismaService.exercise.findFirst({
      where: {
        id: exerciseId,
        OR: [{ organizationId: null }, { organizationId }],
      },
    });

    if (!exercise) {
      throw new BadRequestException('Exercise does not exist or is not accessible');
    }

    return exercise;
  }

  private async ensureSessionExerciseVisible(
    sessionExerciseId: string,
    organizationId: string,
  ) {
    return this.getSessionExerciseForOrganization(sessionExerciseId, organizationId);
  }

  private async ensureAlternativeVisible(
    alternativeId: string,
    organizationId: string,
  ) {
    const alternative = await this.prismaService.sessionExerciseAlternative.findFirst({
      where: {
        id: alternativeId,
        sessionExercise: {
          session: this.sessionOrganizationWhere(organizationId),
        },
      },
    });

    if (!alternative) {
      throw new NotFoundException('Alternative was not found');
    }

    return alternative;
  }

  private async getSessionExerciseForOrganization(
    sessionExerciseId: string,
    organizationId: string,
  ) {
    const sessionExercise = await this.prismaService.sessionExercise.findFirst({
      where: {
        id: sessionExerciseId,
        session: this.sessionOrganizationWhere(organizationId),
      },
      include: {
        exercise: true,
        alternatives: {
          include: {
            alternativeExercise: true,
          },
        },
      },
    });

    if (!sessionExercise) {
      throw new NotFoundException('Session exercise was not found');
    }

    return sessionExercise;
  }

  private sessionOrganizationWhere(organizationId: string) {
    return {
      day: {
        week: {
          trainingPlan: {
            organizationId,
            planType: TrainingPlanType.template,
          },
        },
      },
    };
  }

  private parsePlanUpdateData(body: UpdatePlanDto) {
    const data: {
      name?: string;
      goal?: string | null;
      level?: string | null;
      durationWeeks?: number;
      generalNotes?: string | null;
    } = {};

    if (body.name !== undefined) {
      data.name = this.parseString(body.name, 'name', true);
    }
    if (body.goal !== undefined) {
      data.goal = this.parseOptionalString(body.goal, 'goal');
    }
    if (body.level !== undefined) {
      data.level = this.parseTrainingLevel(body.level);
    }
    if (body.durationWeeks !== undefined) {
      const durationWeeks = this.parsePositiveInt(body.durationWeeks.toString(), 1);
      if (durationWeeks > 52) {
        throw new BadRequestException('durationWeeks must be between 1 and 52');
      }
      data.durationWeeks = durationWeeks;
    }
    if (body.generalNotes !== undefined) {
      data.generalNotes = this.parseOptionalString(body.generalNotes, 'generalNotes');
    }

    return data;
  }

  private parseSessionUpdateData(body: UpdateSessionDto) {
    const data: {
      name?: string;
      description?: string | null;
      coachNote?: string | null;
    } = {};

    if (body.name !== undefined) {
      data.name = this.parseString(body.name, 'name', true);
    }
    if (body.description !== undefined) {
      data.description = this.parseOptionalString(body.description, 'description');
    }
    if (body.coachNote !== undefined) {
      data.coachNote = this.parseOptionalString(body.coachNote, 'coachNote');
    }

    return data;
  }

  private parseSessionExerciseUpdateData(body: UpdateSessionExerciseDto) {
    const data: {
      exerciseId?: string;
      orderIndex?: number;
      sets?: number | null;
      reps?: string;
      restSeconds?: number | null;
      coachNote?: string | null;
    } = {};

    if (body.exerciseId !== undefined) {
      data.exerciseId = this.parseString(body.exerciseId, 'exerciseId', true);
    }
    if (body.orderIndex !== undefined) {
      data.orderIndex = this.parseNonNegativeInt(body.orderIndex, 'orderIndex');
    }
    if (body.sets !== undefined) {
      data.sets = this.parseNullablePositiveInt(body.sets, 'sets');
    }
    if (body.reps !== undefined) {
      data.reps = this.parseString(body.reps, 'reps', true);
    }
    if (body.restSeconds !== undefined) {
      data.restSeconds = this.parseNullablePositiveInt(body.restSeconds, 'restSeconds');
    }
    if (body.coachNote !== undefined) {
      data.coachNote = this.parseOptionalString(body.coachNote, 'coachNote');
    }

    return data;
  }

  private parseString(value: unknown, field: string, required: true): string;
  private parseString(value: unknown, field: string, required: false): string | undefined;
  private parseString(value: unknown, field: string, required: boolean): string | undefined {
    if (value === undefined && !required) {
      return undefined;
    }

    if (typeof value !== 'string') {
      throw new BadRequestException(`${field} is required`);
    }

    const trimmed = value.trim();
    if (!trimmed) {
      throw new BadRequestException(`${field} is required`);
    }

    return trimmed;
  }

  private parseOptionalString(value: unknown, field: string) {
    if (value === undefined || value === null) {
      return null;
    }

    if (typeof value !== 'string') {
      throw new BadRequestException(`${field} must be a string`);
    }

    const trimmed = value.trim();
    return trimmed || null;
  }

  private parsePositiveInt(value: string | undefined, defaultValue: number) {
    if (value === undefined) {
      return defaultValue;
    }

    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new BadRequestException('Value must be a positive integer');
    }

    return parsed;
  }

  private parseNonNegativeInt(value: unknown, field: string) {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 0) {
      throw new BadRequestException(`${field} must be a non-negative integer`);
    }

    return parsed;
  }

  private parseNullablePositiveInt(value: unknown, field: string) {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new BadRequestException(`${field} must be a positive integer`);
    }

    return parsed;
  }

  private parseOptionalPlanStatus(value: unknown) {
    if (value === undefined) {
      return undefined;
    }

    if (
      value !== TrainingPlanStatus.draft &&
      value !== TrainingPlanStatus.active &&
      value !== TrainingPlanStatus.archived
    ) {
      throw new BadRequestException('status is invalid');
    }

    return value;
  }

  private parseTrainingLevel(value: unknown) {
    const level = this.parseOptionalString(value, 'level');
    if (level === null) {
      return null;
    }

    if (!trainingLevelValues.includes(level as (typeof trainingLevelValues)[number])) {
      throw new BadRequestException('level must be beginner, intermediate or advanced');
    }

    return level;
  }

  private async syncPlanWeeks(
    tx: Pick<PrismaService, 'trainingPlanWeek'>,
    planId: string,
    nextDurationWeeks: number,
  ) {
    const overflowingWeek = await tx.trainingPlanWeek.findFirst({
      where: {
        trainingPlanId: planId,
        weekNumber: { gt: nextDurationWeeks },
      },
      orderBy: { weekNumber: 'asc' },
    });

    if (overflowingWeek) {
      throw new ConflictException(
        'Cannot reduce durationWeeks while weeks exist outside the new range',
      );
    }

    const lastWeek = await tx.trainingPlanWeek.findFirst({
      where: { trainingPlanId: planId },
      orderBy: { weekNumber: 'desc' },
    });

    for (let weekNumber = (lastWeek?.weekNumber ?? 0) + 1; weekNumber <= nextDurationWeeks; weekNumber++) {
      await tx.trainingPlanWeek.create({
        data: {
          trainingPlanId: planId,
          weekNumber,
        },
      });
    }
  }

  private async getSeedOrganizationId(): Promise<string | null> {
    const setting = await this.prismaService.systemSetting.findUnique({
      where: { key: 'system.seedOrganizationId' },
    });
    return setting && typeof setting.value === 'string'
      ? setting.value
      : null;
  }

  private parseDayOfWeek(value: unknown): DayOfWeek {
    if (typeof value !== 'string') {
      throw new BadRequestException('dayOfWeek is required');
    }

    const trimmed = value.trim().toLowerCase();
    if (!dayOfWeekValues.includes(trimmed as DayOfWeek)) {
      throw new BadRequestException('dayOfWeek is invalid');
    }

    return trimmed as DayOfWeek;
  }
}
