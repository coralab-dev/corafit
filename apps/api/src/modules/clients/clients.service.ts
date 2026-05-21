import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes, randomInt } from 'node:crypto';
import * as argon2 from 'argon2';
import {
  ClientAccessStatus,
  ClientOperationalStatus,
  ClientTrainingPlanAssignmentStatus,
  ClientType,
  DayOfWeek,
  TrainingDayType,
  TrainingPlanStatus,
  TrainingPlanType,
  type OrganizationMember,
} from 'db';
import type {
  AssignPlanDto,
  CreateClientDto,
  ListClientsQuery,
  UpdateClientDto,
  UpdateClientStatusDto,
  UpdateCurrentPlanAssignmentDto,
} from './dto/client.dto';
import type {
  CopyDayDto,
  CreateDayDto,
  CreateSessionDto,
  CreateSessionExerciseAlternativeDto,
  CreateSessionExerciseDto,
  CreateWeekDto,
  ReorderSessionExercisesDto,
  UpdateSessionExerciseAlternativeDto,
  UpdateSessionExerciseDto,
  UpdateSessionDto,
} from '../training-plans/dto/training-plan.dto';
import type { AppConfig } from '../../config/env.schema';
import { PrismaService } from '../../common/prisma/prisma.service';

type ClientAccessTokenResult = {
  access: {
    clientId: string;
    id: string;
    status: ClientAccessStatus;
  };
  link: string;
  token: string;
  pin: string;
};

const trainingLevelValues = ['beginner', 'intermediate', 'advanced'] as const;

type PlanEditTransaction = Pick<
  PrismaService,
  | 'sessionExercise'
  | 'sessionExerciseAlternative'
  | 'trainingPlan'
  | 'trainingPlanDay'
  | 'trainingPlanWeek'
  | 'trainingSession'
>;

@Injectable()
export class ClientsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  getStatus() {
    return { module: 'clients', status: 'ready' };
  }

  async list(query: ListClientsQuery, member: OrganizationMember | undefined) {
    const organizationId = this.getOrganizationId(member);
    const page = this.parsePositiveInt(query.page, 1);
    const limit = Math.min(this.parsePositiveInt(query.limit, 20), 100);
    const status = this.parseOptionalStatus(query.status);
    const search = query.search?.trim();

    const where = {
      organizationId,
      ...(status
        ? { operationalStatus: status }
        : { operationalStatus: { not: ClientOperationalStatus.archived } }),
      ...(search
        ? {
            name: {
              contains: search,
              mode: 'insensitive' as const,
            },
          }
        : {}),
    };

    const [items, total] = await this.prismaService.$transaction([
      this.prismaService.client.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prismaService.client.count({ where }),
    ]);

    return { items, page, limit, total };
  }

  async create(body: CreateClientDto, member: OrganizationMember | undefined) {
    if (!member) {
      throw new ForbiddenException('Organization membership is required');
    }
    const organizationId = this.getOrganizationId(member);
    const data = this.parseClientData(body, true);

    return this.prismaService.client.create({
      data: {
        age: data.age,
        canRegisterWeight: data.canRegisterWeight,
        clientType: data.clientType as ClientType,
        generalNotes: data.generalNotes,
        heightCm: data.heightCm as number,
        initialWeightKg: data.initialWeightKg as number,
        injuriesNotes: data.injuriesNotes,
        mainGoal: data.mainGoal as string,
        name: data.name as string,
        phone: data.phone,
        sex: data.sex,
        trainingLevel: data.trainingLevel,
        organizationId,
        assignedCoachMemberId: member.id,
      },
    });
  }

  async getById(clientId: string, member: OrganizationMember | undefined) {
    return this.getClientForOrganization(clientId, this.getOrganizationId(member));
  }

  async update(
    clientId: string,
    body: UpdateClientDto,
    member: OrganizationMember | undefined,
  ) {
    const organizationId = this.getOrganizationId(member);
    await this.getClientForOrganization(clientId, organizationId);
    const data = this.parseClientData(body, false);

    return this.prismaService.client.update({
      where: { id: clientId },
      data,
    });
  }

  async updateStatus(
    clientId: string,
    body: UpdateClientStatusDto,
    member: OrganizationMember | undefined,
  ) {
    const organizationId = this.getOrganizationId(member);
    await this.getClientForOrganization(clientId, organizationId);
    const operationalStatus = this.parseStatus(body.status);

    return this.prismaService.client.update({
      where: { id: clientId },
      data: { operationalStatus },
    });
  }

  async getNotes(clientId: string, member: OrganizationMember | undefined) {
    const organizationId = this.getOrganizationId(member);
    await this.getClientForOrganization(clientId, organizationId);

    return this.prismaService.followUpNote.findMany({
      where: {
        clientId,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createAccess(
    clientId: string,
    member: OrganizationMember | undefined,
  ): Promise<ClientAccessTokenResult> {
    const organizationId = this.getOrganizationId(member);
    await this.getClientForOrganization(clientId, organizationId);
    const existingAccess = await this.prismaService.clientAccess.findUnique({
      where: { clientId },
    });

    if (existingAccess?.tokenHash && existingAccess.status !== ClientAccessStatus.disabled) {
      throw new ConflictException('ACCESS_ALREADY_EXISTS');
    }

    const token = this.generateToken();
    const tokenHash = this.hashToken(token);
    const pin = this.generatePin();
    const pinHash = await this.hashPin(pin);
    const access = existingAccess
      ? await this.prismaService.clientAccess.update({
          where: { clientId },
          data: {
            tokenHash,
            pinHash,
            status: ClientAccessStatus.active,
            failedAttempts: 0,
            lockedUntil: null,
          },
        })
      : await this.prismaService.clientAccess.create({
          data: {
            clientId,
            tokenHash,
            pinHash,
            status: ClientAccessStatus.active,
          },
        });

    return this.formatAccessTokenResult(access, token, pin);
  }

  async getAccess(clientId: string, member: OrganizationMember | undefined) {
    const organizationId = this.getOrganizationId(member);
    await this.getClientForOrganization(clientId, organizationId);
    const access = await this.prismaService.clientAccess.findUnique({
      where: { clientId },
    });

    if (!access) {
      return null;
    }

    return {
      clientId: access.clientId,
      id: access.id,
      lastAccessAt: access.lastAccessAt,
      lockedUntil: access.lockedUntil,
      status: access.status,
    };
  }

  async regenerateAccess(
    clientId: string,
    member: OrganizationMember | undefined,
  ): Promise<ClientAccessTokenResult> {
    const organizationId = this.getOrganizationId(member);
    await this.getClientForOrganization(clientId, organizationId);
    const token = this.generateToken();
    const tokenHash = this.hashToken(token);
    const pin = this.generatePin();
    const pinHash = await this.hashPin(pin);
    const access = await this.prismaService.clientAccess.upsert({
      where: { clientId },
      create: {
        clientId,
        tokenHash,
        pinHash,
        status: ClientAccessStatus.active,
      },
      update: {
        tokenHash,
        pinHash,
        status: ClientAccessStatus.active,
        failedAttempts: 0,
        lockedUntil: null,
      },
    });

    await this.invalidateSessions(access.id);

    return this.formatAccessTokenResult(access, token, pin);
  }

  async disableAccess(clientId: string, member: OrganizationMember | undefined) {
    const organizationId = this.getOrganizationId(member);
    await this.getClientForOrganization(clientId, organizationId);
    const access = await this.prismaService.clientAccess.findUnique({
      where: { clientId },
    });

    if (!access) {
      throw new NotFoundException('Client access was not found');
    }

    await this.invalidateSessions(access.id);

    return this.prismaService.clientAccess.update({
      where: { clientId },
      data: {
        tokenHash: null,
        pinHash: null,
        status: ClientAccessStatus.disabled,
      },
    });
  }

  private async getClientForOrganization(clientId: string, organizationId: string) {
    const client = await this.prismaService.client.findFirst({
      where: { id: clientId, organizationId },
    });

    if (!client) {
      throw new NotFoundException('Client was not found');
    }

    return client;
  }

  private formatAccessTokenResult(
    access: { clientId: string; id: string; status: ClientAccessStatus },
    token: string,
    pin?: string,
  ): ClientAccessTokenResult {
    return {
      access: {
        clientId: access.clientId,
        id: access.id,
        status: access.status,
      },
      link: `${this.configService.get('WEB_APP_URL', { infer: true })}/c/${token}`,
      token,
      pin: pin ?? '',
    };
  }

  private generateToken() {
    return randomBytes(32).toString('base64url');
  }

  private getOrganizationId(member: OrganizationMember | undefined) {
    if (!member) {
      throw new ForbiddenException('Organization membership is required');
    }

    return member.organizationId;
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private parseClientData(
    body: Partial<CreateClientDto>,
    requireFields: boolean,
  ) {
    const name = this.parseString(body.name, 'name', requireFields);
    const clientType = this.parseClientType(body.clientType, requireFields);
    const mainGoal = this.parseString(body.mainGoal, 'mainGoal', requireFields);
    const heightCm = this.parseNumber(body.heightCm, 'heightCm', requireFields);
    const initialWeightKg = this.parseNumber(
      body.initialWeightKg,
      'initialWeightKg',
      requireFields,
    );

    return {
      ...(name !== undefined ? { name } : {}),
      ...(body.phone !== undefined ? { phone: this.parseOptionalString(body.phone, 'phone') } : {}),
      ...(body.age !== undefined ? { age: this.parseOptionalInt(body.age, 'age') } : {}),
      ...(body.sex !== undefined ? { sex: this.parseOptionalString(body.sex, 'sex') } : {}),
      ...(clientType !== undefined ? { clientType } : {}),
      ...(mainGoal !== undefined ? { mainGoal } : {}),
      ...(heightCm !== undefined ? { heightCm } : {}),
      ...(initialWeightKg !== undefined ? { initialWeightKg } : {}),
      ...(body.trainingLevel !== undefined
        ? { trainingLevel: this.parseOptionalString(body.trainingLevel, 'trainingLevel') }
        : {}),
      ...(body.injuriesNotes !== undefined
        ? { injuriesNotes: this.parseOptionalString(body.injuriesNotes, 'injuriesNotes') }
        : {}),
      ...(body.generalNotes !== undefined
        ? { generalNotes: this.parseOptionalString(body.generalNotes, 'generalNotes') }
        : {}),
      ...(body.canRegisterWeight !== undefined
        ? { canRegisterWeight: this.parseBoolean(body.canRegisterWeight) }
        : {}),
    };
  }

  private parseBoolean(value: unknown) {
    if (typeof value !== 'boolean') {
      throw new BadRequestException('canRegisterWeight must be boolean');
    }

    return value;
  }

  private parseClientType(value: unknown, required: boolean) {
    if (value === undefined && !required) {
      return undefined;
    }

    if (
      value !== ClientType.presential &&
      value !== ClientType.online &&
      value !== ClientType.hybrid
    ) {
      throw new BadRequestException('clientType is invalid');
    }

    return value;
  }

  private parseNumber(value: unknown, field: string, required: boolean) {
    if (value === undefined && !required) {
      return undefined;
    }

    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
      throw new BadRequestException(`${field} must be a positive number`);
    }

    return value;
  }

  private parseOptionalInt(value: unknown, field: string) {
    if (value === null) {
      return null;
    }

    if (!Number.isInteger(value) || Number(value) <= 0) {
      throw new BadRequestException(`${field} must be a positive integer`);
    }

    return value as number;
  }

  private parseOptionalStatus(value: unknown) {
    if (value === undefined) {
      return undefined;
    }

    return this.parseStatus(value);
  }

  private parseOptionalString(value: unknown, field: string) {
    if (value === null) {
      return null;
    }

    if (typeof value !== 'string') {
      throw new BadRequestException(`${field} must be a string`);
    }

    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  private parsePositiveInt(value: string | undefined, defaultValue: number) {
    if (value === undefined) {
      return defaultValue;
    }

    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new BadRequestException('Pagination values must be positive integers');
    }

    return parsed;
  }

  private parseStatus(value: unknown) {
    if (
      value !== ClientOperationalStatus.active &&
      value !== ClientOperationalStatus.paused &&
      value !== ClientOperationalStatus.inactive &&
      value !== ClientOperationalStatus.archived
    ) {
      throw new BadRequestException('status is invalid');
    }

    return value;
  }

  private parseString(value: unknown, field: string, required: boolean) {
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

  generatePin(): string {
    return randomInt(100000, 1000000).toString();
  }

  async hashPin(pin: string): Promise<string> {
    return argon2.hash(pin, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 1,
    });
  }

  async invalidateSessions(accessId: string): Promise<void> {
    await this.prismaService.clientPortalSession.updateMany({
      where: { accessId, invalidated: false },
      data: { invalidated: true },
    });
  }

  async assignPlan(
    clientId: string,
    body: AssignPlanDto,
    member: OrganizationMember | undefined,
  ) {
    if (!member) {
      throw new ForbiddenException('Organization membership is required');
    }

    const organizationId = this.getOrganizationId(member);
    const trainingPlanId = this.parseRequiredString(
      body.trainingPlanId,
      'trainingPlanId',
    );
    const startDate = this.parseOptionalDate(body.startDate, 'startDate');

    await this.getClientForOrganization(clientId, organizationId);

    const seedOrgId = await this.getSeedOrganizationId();

    const sourcePlan = await this.prismaService.trainingPlan.findFirst({
      where: {
        id: trainingPlanId,
        planType: TrainingPlanType.template,
        status: TrainingPlanStatus.active,
        OR: [
          { organizationId: member.organizationId },
          ...(seedOrgId ? [{ organizationId: seedOrgId }] : []),
        ],
      },
      include: {
        weeks: {
          orderBy: { weekNumber: 'asc' },
          include: {
            days: {
              orderBy: { dayOrder: 'asc' },
              include: {
                session: {
                  include: {
                    exercises: {
                      orderBy: { orderIndex: 'asc' },
                      include: { alternatives: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!sourcePlan) {
      throw new NotFoundException('PLAN_NOT_FOUND');
    }

    const existingAssignment =
      await this.prismaService.clientTrainingPlanAssignment.findFirst({
        where: {
          clientId,
          status: ClientTrainingPlanAssignmentStatus.active,
        },
      });

    if (existingAssignment) {
      throw new ConflictException('ACTIVE_ASSIGNMENT_EXISTS');
    }

    try {
      return await this.prismaService.$transaction(async (tx) => {
        const assignedPlan = await tx.trainingPlan.create({
          data: {
            name: sourcePlan.name,
            goal: sourcePlan.goal,
            level: sourcePlan.level,
            durationWeeks: sourcePlan.durationWeeks,
            generalNotes: sourcePlan.generalNotes,
            status: TrainingPlanStatus.active,
            planType: TrainingPlanType.assigned_copy,
            sourcePlanId: sourcePlan.id,
            assignedClientId: clientId,
            organizationId: member.organizationId,
            createdByMemberId: member.id,
          },
        });

        let weeksCopied = 0;
        let daysCopied = 0;
        let sessionsCopied = 0;
        let exercisesCopied = 0;
        let alternativesCopied = 0;

        for (const originalWeek of sourcePlan.weeks) {
          const week = await tx.trainingPlanWeek.create({
            data: {
              trainingPlanId: assignedPlan.id,
              weekNumber: originalWeek.weekNumber,
              notes: originalWeek.notes,
            },
          });
          weeksCopied++;

          for (const originalDay of originalWeek.days) {
            const day = await tx.trainingPlanDay.create({
              data: {
                trainingPlanWeekId: week.id,
                dayOfWeek: originalDay.dayOfWeek,
                dayOrder: originalDay.dayOrder,
                dayType: originalDay.dayType,
              },
            });
            daysCopied++;

            if (originalDay.session) {
              const session = await tx.trainingSession.create({
                data: {
                  trainingPlanDayId: day.id,
                  name: originalDay.session.name,
                  description: originalDay.session.description,
                  coachNote: originalDay.session.coachNote,
                },
              });
              sessionsCopied++;

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
                exercisesCopied++;

                for (const originalAlt of originalExercise.alternatives) {
                  await tx.sessionExerciseAlternative.create({
                    data: {
                      sessionExerciseId: exercise.id,
                      alternativeExerciseId: originalAlt.alternativeExerciseId,
                      note: originalAlt.note,
                    },
                  });
                  alternativesCopied++;
                }
              }
            }
          }
        }

        const assignment = await tx.clientTrainingPlanAssignment.create({
          data: {
            clientId,
            sourceTrainingPlanId: sourcePlan.id,
            assignedPlanId: assignedPlan.id,
            assignedByMemberId: member.id,
            startDate,
            status: ClientTrainingPlanAssignmentStatus.active,
          },
        });

        return {
          assignment,
          assignedPlan,
          metadata: {
            weeksCopied,
            daysCopied,
            sessionsCopied,
            exercisesCopied,
            alternativesCopied,
          },
        };
      }, {
        maxWait: 10_000,
        timeout: 20_000,
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('ACTIVE_ASSIGNMENT_EXISTS');
      }

      throw error;
    }
  }

  async getCurrentPlanAssignment(
    clientId: string,
    member: OrganizationMember | undefined,
  ) {
    const organizationId = this.getOrganizationId(member);
    await this.getClientForOrganization(clientId, organizationId);

    const assignment = await this.getCurrentAssignmentForClient(clientId);

    if (!assignment) {
      return null;
    }

    const sourcePlan = await this.prismaService.trainingPlan.findUnique({
      where: { id: assignment.sourceTrainingPlanId },
      select: { id: true, name: true },
    });

    const assignedPlan = await this.prismaService.trainingPlan.findUnique({
      where: { id: assignment.assignedPlanId },
      include: {
        weeks: {
          orderBy: { weekNumber: 'asc' },
          include: {
            days: {
              orderBy: { dayOrder: 'asc' },
              include: {
                session: {
                  include: {
                    exercises: {
                      orderBy: { orderIndex: 'asc' },
                      include: {
                        alternatives: true,
                        exercise: true,
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

    return {
      assignment,
      sourcePlan,
      assignedPlan,
    };
  }

  async updateCurrentPlanAssignment(
    clientId: string,
    body: UpdateCurrentPlanAssignmentDto,
    member: OrganizationMember | undefined,
  ) {
    if (!member) {
      throw new ForbiddenException('Organization membership is required');
    }

    const organizationId = this.getOrganizationId(member);
    await this.getClientForOrganization(clientId, organizationId);

    const assignment = await this.getCurrentAssignmentForClient(clientId);

    if (!assignment) {
      throw new NotFoundException('ACTIVE_ASSIGNMENT_NOT_FOUND');
    }

    await this.assertAssignedCopy(assignment);

    const planData = this.parseCurrentAssignmentPlanUpdateData(body);
    const sessionUpdates = this.parseCurrentAssignmentSessionUpdates(body);
    const exerciseUpdates = this.parseCurrentAssignmentExerciseUpdates(body);

    if (
      !Object.keys(planData).length &&
      !sessionUpdates.length &&
      !exerciseUpdates.length
    ) {
      throw new BadRequestException('At least one field is required');
    }

    const updatedPlan = await this.prismaService.$transaction(async (tx) => {
      for (const session of sessionUpdates) {
        await this.ensureAssignedSessionInPlan(
          session.sessionId,
          assignment.assignedPlanId,
        );
        await tx.trainingSession.update({
          where: { id: session.sessionId },
          data: session.data,
        });
      }

      for (const exercise of exerciseUpdates) {
        await this.ensureAssignedSessionExerciseInPlan(
          exercise.sessionExerciseId,
          assignment.assignedPlanId,
        );
        if (exercise.data.exerciseId !== undefined) {
          await this.ensureExerciseVisible(
            exercise.data.exerciseId,
            member.organizationId,
          );
        }
        await tx.sessionExercise.update({
          where: { id: exercise.sessionExerciseId },
          data: exercise.data,
        });
      }

      return tx.trainingPlan.update({
        where: { id: assignment.assignedPlanId },
        data: planData,
        include: {
          weeks: {
            orderBy: { weekNumber: 'asc' },
            include: {
              days: {
                orderBy: { dayOrder: 'asc' },
                include: {
                  session: {
                    include: {
                      exercises: {
                        orderBy: { orderIndex: 'asc' },
                        include: {
                          alternatives: true,
                          exercise: true,
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
    });

    return {
      assignment,
      assignedPlan: updatedPlan,
    };
  }

  async endCurrentPlanAssignment(
    clientId: string,
    member: OrganizationMember | undefined,
  ) {
    if (!member) {
      throw new ForbiddenException('Organization membership is required');
    }

    const organizationId = this.getOrganizationId(member);
    await this.getClientForOrganization(clientId, organizationId);

    const assignment = await this.getCurrentAssignmentForClient(clientId);

    if (!assignment) {
      throw new NotFoundException('ACTIVE_ASSIGNMENT_NOT_FOUND');
    }

    const updatedAssignment =
      await this.prismaService.clientTrainingPlanAssignment.update({
        where: { id: assignment.id },
        data: {
          status: ClientTrainingPlanAssignmentStatus.finished,
          endedAt: new Date(),
        },
      });

    return updatedAssignment;
  }

  async createCurrentAssignmentWeek(
    clientId: string,
    body: CreateWeekDto,
    member: OrganizationMember | undefined,
  ) {
    const { assignment } = await this.getWritableCurrentAssignment(clientId, member);
    const plan = await this.prismaService.trainingPlan.findUnique({
      where: { id: assignment.assignedPlanId },
      select: { durationWeeks: true },
    });

    const weekNumber = body.weekNumber !== undefined
      ? this.parsePositiveInt(body.weekNumber.toString(), 1)
      : undefined;

    if (weekNumber !== undefined && weekNumber > 52) {
      throw new BadRequestException('weekNumber must be between 1 and 52');
    }

    const existingWeek = weekNumber !== undefined
      ? await this.prismaService.trainingPlanWeek.findFirst({
          where: { trainingPlanId: assignment.assignedPlanId, weekNumber },
        })
      : null;

    if (existingWeek) {
      throw new ConflictException('A week with that number already exists');
    }

    const maxWeek = await this.prismaService.trainingPlanWeek.findFirst({
      where: { trainingPlanId: assignment.assignedPlanId },
      orderBy: { weekNumber: 'desc' },
    });

    const nextWeekNumber = weekNumber ?? ((maxWeek?.weekNumber ?? 0) + 1);
    const notes = body.notes !== undefined
      ? this.parseOptionalString(body.notes, 'notes')
      : null;

    const createdWeek = await this.prismaService.trainingPlanWeek.create({
      data: {
        trainingPlanId: assignment.assignedPlanId,
        weekNumber: nextWeekNumber,
        notes,
      },
    });

    if (nextWeekNumber > (plan?.durationWeeks ?? 0)) {
      await this.prismaService.trainingPlan.update({
        where: { id: assignment.assignedPlanId },
        data: { durationWeeks: nextWeekNumber },
      });
    }

    return createdWeek;
  }

  async duplicateCurrentAssignmentWeek(
    clientId: string,
    weekId: string,
    member: OrganizationMember | undefined,
  ) {
    const { assignment } = await this.getWritableCurrentAssignment(clientId, member);
    const originalWeek = await this.getAssignedWeek(weekId, assignment.assignedPlanId);
    const maxWeek = await this.prismaService.trainingPlanWeek.findFirst({
      where: { trainingPlanId: assignment.assignedPlanId },
      orderBy: { weekNumber: 'desc' },
    });
    const nextWeekNumber = (maxWeek?.weekNumber ?? 0) + 1;

    return this.prismaService.$transaction(async (tx) => {
      const week = await tx.trainingPlanWeek.create({
        data: {
          trainingPlanId: assignment.assignedPlanId,
          weekNumber: nextWeekNumber,
          notes: originalWeek.notes,
        },
      });

      await this.copyWeekDays(tx, originalWeek.days, week.id);

      if (
        originalWeek.trainingPlan?.durationWeeks !== undefined &&
        nextWeekNumber > originalWeek.trainingPlan.durationWeeks
      ) {
        await tx.trainingPlan.update({
          where: { id: assignment.assignedPlanId },
          data: { durationWeeks: nextWeekNumber },
        });
      }

      return week;
    });
  }

  async deleteCurrentAssignmentWeek(
    clientId: string,
    weekId: string,
    member: OrganizationMember | undefined,
  ) {
    const { assignment } = await this.getWritableCurrentAssignment(clientId, member);
    const week = await this.getAssignedWeek(weekId, assignment.assignedPlanId);

    return this.prismaService.$transaction(async (tx) => {
      const days = await tx.trainingPlanDay.findMany({
        where: { trainingPlanWeekId: week.id },
        include: { session: { include: { exercises: { include: { alternatives: true } } } } },
      });

      await this.deleteDaysWithChildren(tx, days);
      await tx.trainingPlanWeek.delete({ where: { id: week.id } });

      const lastWeek = await tx.trainingPlanWeek.findFirst({
        where: { trainingPlanId: assignment.assignedPlanId },
        orderBy: { weekNumber: 'desc' },
      });
      await tx.trainingPlan.update({
        where: { id: assignment.assignedPlanId },
        data: { durationWeeks: Math.max(lastWeek?.weekNumber ?? 1, 1) },
      });

      return { deleted: true };
    });
  }

  async createCurrentAssignmentDay(
    clientId: string,
    weekId: string,
    body: CreateDayDto,
    member: OrganizationMember | undefined,
  ) {
    const { assignment } = await this.getWritableCurrentAssignment(clientId, member);
    await this.getAssignedWeek(weekId, assignment.assignedPlanId);

    const dayOfWeek = this.parseDayOfWeek(body.dayOfWeek);
    const dayType = body.dayType !== undefined
      ? this.parseDayType(body.dayType)
      : TrainingDayType.training;
    const dayOrder = body.dayOrder !== undefined
      ? this.parseNonNegativeInt(body.dayOrder, 'dayOrder')
      : null;

    const existingDay = await this.prismaService.trainingPlanDay.findFirst({
      where: { trainingPlanWeekId: weekId, dayOfWeek },
    });
    if (existingDay) {
      throw new ConflictException('A day already exists for that day of week');
    }

    return this.prismaService.trainingPlanDay.create({
      data: { trainingPlanWeekId: weekId, dayOfWeek, dayType, dayOrder },
    });
  }

  async copyCurrentAssignmentDay(
    clientId: string,
    dayId: string,
    body: CopyDayDto,
    member: OrganizationMember | undefined,
  ) {
    const { assignment } = await this.getWritableCurrentAssignment(clientId, member);
    const originalDay = await this.getAssignedDay(dayId, assignment.assignedPlanId);
    const targetDayOfWeek = this.parseDayOfWeek(body.dayOfWeek);

    const existingDay = await this.prismaService.trainingPlanDay.findFirst({
      where: {
        trainingPlanWeekId: originalDay.trainingPlanWeekId,
        dayOfWeek: targetDayOfWeek,
      },
    });
    if (existingDay) {
      throw new ConflictException('A day already exists for the target day of week');
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
        await this.copySession(tx, originalDay.session, day.id);
      }

      return day;
    });
  }

  async deleteCurrentAssignmentDay(
    clientId: string,
    dayId: string,
    member: OrganizationMember | undefined,
  ) {
    const { assignment } = await this.getWritableCurrentAssignment(clientId, member);
    const day = await this.getAssignedDay(dayId, assignment.assignedPlanId);

    return this.prismaService.$transaction(async (tx) => {
      await this.deleteDaysWithChildren(tx, [day]);
      return { deleted: true };
    });
  }

  async createCurrentAssignmentSession(
    clientId: string,
    dayId: string,
    body: CreateSessionDto,
    member: OrganizationMember | undefined,
  ) {
    const { assignment } = await this.getWritableCurrentAssignment(clientId, member);
    await this.getAssignedDay(dayId, assignment.assignedPlanId);

    return this.prismaService.trainingSession.create({
      data: {
        trainingPlanDayId: dayId,
        name: this.parseRequiredString(body.name, 'name'),
        description: body.description === undefined ? null : this.parseOptionalString(body.description, 'description'),
        coachNote: body.coachNote === undefined ? null : this.parseOptionalString(body.coachNote, 'coachNote'),
      },
    });
  }

  async updateCurrentAssignmentSession(
    clientId: string,
    sessionId: string,
    body: UpdateSessionDto,
    member: OrganizationMember | undefined,
  ) {
    const { assignment } = await this.getWritableCurrentAssignment(clientId, member);
    await this.ensureAssignedSessionInPlan(sessionId, assignment.assignedPlanId);
    const data = this.parseCurrentAssignmentSessionUpdates({ sessions: [{ sessionId, ...body }] })[0]?.data;
    if (!data) {
      throw new BadRequestException('At least one session field is required');
    }

    return this.prismaService.trainingSession.update({ where: { id: sessionId }, data });
  }

  async deleteCurrentAssignmentSession(
    clientId: string,
    sessionId: string,
    member: OrganizationMember | undefined,
  ) {
    const { assignment } = await this.getWritableCurrentAssignment(clientId, member);
    const session = await this.getAssignedSessionWithExercises(sessionId, assignment.assignedPlanId);

    return this.prismaService.$transaction(async (tx) => {
      for (const exercise of session.exercises) {
        await tx.sessionExerciseAlternative.deleteMany({ where: { sessionExerciseId: exercise.id } });
        await tx.sessionExercise.delete({ where: { id: exercise.id } });
      }
      await tx.trainingSession.delete({ where: { id: sessionId } });
      return { deleted: true };
    });
  }

  async createCurrentAssignmentSessionExercise(
    clientId: string,
    sessionId: string,
    body: CreateSessionExerciseDto,
    member: OrganizationMember | undefined,
  ) {
    const { assignment, organizationId } = await this.getWritableCurrentAssignment(clientId, member);
    await this.ensureAssignedSessionInPlan(sessionId, assignment.assignedPlanId);
    await this.ensureExerciseVisible(body.exerciseId, organizationId);

    const maxExercise = await this.prismaService.sessionExercise.findFirst({
      where: { trainingSessionId: sessionId },
      orderBy: { orderIndex: 'desc' },
    });
    const orderIndex = body.orderIndex === undefined
      ? (maxExercise?.orderIndex ?? -1) + 1
      : this.parseNonNegativeInt(body.orderIndex, 'orderIndex');

    return this.prismaService.sessionExercise.create({
      data: {
        trainingSessionId: sessionId,
        exerciseId: body.exerciseId,
        orderIndex,
        sets: body.sets === undefined ? null : this.parseNullablePositiveInt(body.sets, 'sets'),
        reps: this.parseRequiredString(body.reps, 'reps'),
        restSeconds: body.restSeconds === undefined ? null : this.parseNullablePositiveInt(body.restSeconds, 'restSeconds'),
        coachNote: body.coachNote === undefined ? null : this.parseOptionalString(body.coachNote, 'coachNote'),
      },
    });
  }

  async updateCurrentAssignmentSessionExercise(
    clientId: string,
    sessionExerciseId: string,
    body: UpdateSessionExerciseDto,
    member: OrganizationMember | undefined,
  ) {
    const { assignment, organizationId } = await this.getWritableCurrentAssignment(clientId, member);
    await this.ensureAssignedSessionExerciseInPlan(sessionExerciseId, assignment.assignedPlanId);
    if (body.exerciseId !== undefined) {
      await this.ensureExerciseVisible(body.exerciseId, organizationId);
    }
    const data = this.parseCurrentAssignmentExerciseUpdates({ exercises: [{ sessionExerciseId, ...body }] })[0]?.data;
    if (!data) {
      throw new BadRequestException('At least one exercise field is required');
    }

    return this.prismaService.sessionExercise.update({ where: { id: sessionExerciseId }, data });
  }

  async deleteCurrentAssignmentSessionExercise(
    clientId: string,
    sessionExerciseId: string,
    member: OrganizationMember | undefined,
  ) {
    const { assignment } = await this.getWritableCurrentAssignment(clientId, member);
    await this.ensureAssignedSessionExerciseInPlan(sessionExerciseId, assignment.assignedPlanId);
    await this.prismaService.sessionExercise.delete({ where: { id: sessionExerciseId } });
    return { deleted: true };
  }

  async duplicateCurrentAssignmentSessionExercise(
    clientId: string,
    sessionExerciseId: string,
    member: OrganizationMember | undefined,
  ) {
    const { assignment } = await this.getWritableCurrentAssignment(clientId, member);
    const original = await this.getAssignedSessionExercise(sessionExerciseId, assignment.assignedPlanId);
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

  async reorderCurrentAssignmentSessionExercises(
    clientId: string,
    body: ReorderSessionExercisesDto,
    member: OrganizationMember | undefined,
  ) {
    const { assignment } = await this.getWritableCurrentAssignment(clientId, member);
    const items = this.parseReorderItems(body);
    const ids = items.map((item) => item.sessionExerciseId);

    const existing = await this.prismaService.sessionExercise.findMany({
      where: {
        id: { in: ids },
        session: {
          day: {
            week: {
              trainingPlanId: assignment.assignedPlanId,
            },
          },
        },
      },
      select: { id: true, trainingSessionId: true },
    });
    if (existing.length !== ids.length) {
      throw new NotFoundException('One or more session exercises were not found');
    }
    if (new Set(existing.map((item) => item.trainingSessionId)).size !== 1) {
      throw new ConflictException('All exercises must belong to the same session');
    }

    return this.prismaService.$transaction(async (tx) => {
      for (let index = 0; index < ids.length; index += 1) {
        await tx.sessionExercise.update({
          where: { id: ids[index] },
          data: { orderIndex: -1 - index },
        });
      }

      for (const item of items) {
        await tx.sessionExercise.update({
          where: { id: item.sessionExerciseId },
          data: { orderIndex: item.orderIndex },
        });
      }

      return { reordered: true };
    });
  }

  async createCurrentAssignmentAlternative(
    clientId: string,
    sessionExerciseId: string,
    body: CreateSessionExerciseAlternativeDto,
    member: OrganizationMember | undefined,
  ) {
    const { assignment, organizationId } = await this.getWritableCurrentAssignment(clientId, member);
    await this.ensureAssignedSessionExerciseInPlan(sessionExerciseId, assignment.assignedPlanId);
    await this.ensureExerciseVisible(body.alternativeExerciseId, organizationId);

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
        note: body.note === undefined ? null : this.parseOptionalString(body.note, 'note'),
      },
    });
  }

  async updateCurrentAssignmentAlternative(
    clientId: string,
    alternativeId: string,
    body: UpdateSessionExerciseAlternativeDto,
    member: OrganizationMember | undefined,
  ) {
    const { assignment, organizationId } = await this.getWritableCurrentAssignment(clientId, member);
    await this.ensureAssignedAlternativeInPlan(alternativeId, assignment.assignedPlanId);
    if (body.alternativeExerciseId !== undefined) {
      await this.ensureExerciseVisible(body.alternativeExerciseId, organizationId);
    }

    const data: { alternativeExerciseId?: string; note?: string | null } = {};
    if (body.alternativeExerciseId !== undefined) {
      data.alternativeExerciseId = this.parseRequiredString(body.alternativeExerciseId, 'alternativeExerciseId');
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

  async deleteCurrentAssignmentAlternative(
    clientId: string,
    alternativeId: string,
    member: OrganizationMember | undefined,
  ) {
    const { assignment } = await this.getWritableCurrentAssignment(clientId, member);
    await this.ensureAssignedAlternativeInPlan(alternativeId, assignment.assignedPlanId);
    await this.prismaService.sessionExerciseAlternative.delete({ where: { id: alternativeId } });
    return { deleted: true };
  }

  private async getCurrentAssignmentForClient(clientId: string) {
    return this.prismaService.clientTrainingPlanAssignment.findFirst({
      where: {
        clientId,
        status: ClientTrainingPlanAssignmentStatus.active,
      },
    });
  }

  private async getWritableCurrentAssignment(
    clientId: string,
    member: OrganizationMember | undefined,
  ) {
    if (!member) {
      throw new ForbiddenException('Organization membership is required');
    }

    const organizationId = this.getOrganizationId(member);
    await this.getClientForOrganization(clientId, organizationId);

    const assignment = await this.getCurrentAssignmentForClient(clientId);
    if (!assignment) {
      throw new NotFoundException('ACTIVE_ASSIGNMENT_NOT_FOUND');
    }

    await this.assertAssignedCopy(assignment);
    return { assignment, organizationId };
  }

  private async getAssignedWeek(weekId: string, assignedPlanId: string) {
    const week = await this.prismaService.trainingPlanWeek.findFirst({
      where: { id: weekId, trainingPlanId: assignedPlanId },
      include: {
        trainingPlan: true,
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

    if (!week) {
      throw new NotFoundException('Week was not found');
    }

    return week;
  }

  private async getAssignedDay(dayId: string, assignedPlanId: string) {
    const day = await this.prismaService.trainingPlanDay.findFirst({
      where: {
        id: dayId,
        week: { trainingPlanId: assignedPlanId },
      },
      include: {
        week: true,
        session: {
          include: {
            exercises: {
              include: { alternatives: true },
            },
          },
        },
      },
    });

    if (!day) {
      throw new NotFoundException('Day was not found');
    }

    return day;
  }

  private async getAssignedSessionWithExercises(
    sessionId: string,
    assignedPlanId: string,
  ) {
    const session = await this.prismaService.trainingSession.findFirst({
      where: {
        id: sessionId,
        day: { week: { trainingPlanId: assignedPlanId } },
      },
      include: {
        exercises: {
          include: { alternatives: true },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Session was not found');
    }

    return session;
  }

  private async getAssignedSessionExercise(
    sessionExerciseId: string,
    assignedPlanId: string,
  ) {
    const exercise = await this.prismaService.sessionExercise.findFirst({
      where: {
        id: sessionExerciseId,
        session: {
          day: {
            week: {
              trainingPlanId: assignedPlanId,
            },
          },
        },
      },
      include: {
        alternatives: true,
      },
    });

    if (!exercise) {
      throw new NotFoundException('Session exercise was not found');
    }

    return exercise;
  }

  private async ensureAssignedAlternativeInPlan(
    alternativeId: string,
    assignedPlanId: string,
  ) {
    const alternative = await this.prismaService.sessionExerciseAlternative.findFirst({
      where: {
        id: alternativeId,
        sessionExercise: {
          session: {
            day: {
              week: {
                trainingPlanId: assignedPlanId,
              },
            },
          },
        },
      },
    });

    if (!alternative) {
      throw new NotFoundException('Alternative was not found');
    }

    return alternative;
  }

  private async copyWeekDays(
    tx: PlanEditTransaction,
    days: Array<{
      dayOfWeek: DayOfWeek;
      dayOrder: number | null;
      dayType: TrainingDayType;
      session: {
        name: string;
        description: string | null;
        coachNote: string | null;
        exercises: Array<{
          exerciseId: string;
          orderIndex: number;
          sets: number | null;
          reps: string;
          restSeconds: number | null;
          coachNote: string | null;
          alternatives: Array<{
            alternativeExerciseId: string;
            note: string | null;
          }>;
        }>;
      } | null;
    }>,
    targetWeekId: string,
  ) {
    for (const originalDay of days) {
      const day = await tx.trainingPlanDay.create({
        data: {
          trainingPlanWeekId: targetWeekId,
          dayOfWeek: originalDay.dayOfWeek,
          dayOrder: originalDay.dayOrder,
          dayType: originalDay.dayType,
        },
      });

      if (originalDay.session) {
        await this.copySession(tx, originalDay.session, day.id);
      }
    }
  }

  private async copySession(
    tx: PlanEditTransaction,
    originalSession: {
      name: string;
      description: string | null;
      coachNote: string | null;
      exercises: Array<{
        exerciseId: string;
        orderIndex: number;
        sets: number | null;
        reps: string;
        restSeconds: number | null;
        coachNote: string | null;
        alternatives: Array<{
          alternativeExerciseId: string;
          note: string | null;
        }>;
      }>;
    },
    targetDayId: string,
  ) {
    const session = await tx.trainingSession.create({
      data: {
        trainingPlanDayId: targetDayId,
        name: originalSession.name,
        description: originalSession.description,
        coachNote: originalSession.coachNote,
      },
    });

    for (const originalExercise of originalSession.exercises) {
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

  private async deleteDaysWithChildren(
    tx: PlanEditTransaction,
    days: Array<{
      id: string;
      session: {
        id: string;
        exercises: Array<{ id: string }>;
      } | null;
    }>,
  ) {
    for (const day of days) {
      if (day.session) {
        for (const exercise of day.session.exercises) {
          await tx.sessionExerciseAlternative.deleteMany({
            where: { sessionExerciseId: exercise.id },
          });
          await tx.sessionExercise.delete({ where: { id: exercise.id } });
        }
        await tx.trainingSession.delete({ where: { id: day.session.id } });
      }
      await tx.trainingPlanDay.delete({ where: { id: day.id } });
    }
  }

  private parseDayOfWeek(value: unknown): DayOfWeek {
    if (typeof value !== 'string') {
      throw new BadRequestException('dayOfWeek is required');
    }

    const trimmed = value.trim().toLowerCase();
    if (
      trimmed !== DayOfWeek.monday &&
      trimmed !== DayOfWeek.tuesday &&
      trimmed !== DayOfWeek.wednesday &&
      trimmed !== DayOfWeek.thursday &&
      trimmed !== DayOfWeek.friday &&
      trimmed !== DayOfWeek.saturday &&
      trimmed !== DayOfWeek.sunday
    ) {
      throw new BadRequestException('dayOfWeek is invalid');
    }

    return trimmed;
  }

  private parseDayType(value: unknown): TrainingDayType {
    if (typeof value !== 'string') {
      throw new BadRequestException('dayType is required');
    }

    const trimmed = value.trim().toLowerCase();
    if (trimmed !== TrainingDayType.training && trimmed !== TrainingDayType.rest) {
      throw new BadRequestException('dayType must be training or rest');
    }

    return trimmed;
  }

  private parseReorderItems(body: ReorderSessionExercisesDto) {
    if (!Array.isArray(body.items) || body.items.length === 0) {
      throw new BadRequestException('items must be a non-empty array');
    }

    const items = body.items.map((item) => ({
      sessionExerciseId: this.parseRequiredString(item.sessionExerciseId, 'sessionExerciseId'),
      orderIndex: this.parseNonNegativeInt(item.orderIndex, 'orderIndex'),
    }));

    if (new Set(items.map((item) => item.sessionExerciseId)).size !== items.length) {
      throw new ConflictException('items contains duplicate sessionExerciseId values');
    }
    if (new Set(items.map((item) => item.orderIndex)).size !== items.length) {
      throw new ConflictException('items contains duplicate orderIndex values');
    }

    return items;
  }

  private async assertAssignedCopy(assignment: {
    assignedPlanId: string;
  }) {
    const plan = await this.prismaService.trainingPlan.findUnique({
      where: { id: assignment.assignedPlanId },
      select: { planType: true },
    });

    if (plan?.planType !== TrainingPlanType.assigned_copy) {
      throw new BadRequestException('ASSIGNED_COPY_REQUIRED');
    }
  }

  private parseCurrentAssignmentPlanUpdateData(
    body: UpdateCurrentPlanAssignmentDto,
  ) {
    const data: {
      name?: string;
      goal?: string | null;
      level?: string | null;
      durationWeeks?: number;
      generalNotes?: string | null;
    } = {};

    if (body.name !== undefined) {
      data.name = this.parseRequiredString(body.name, 'name');
    }
    if (body.goal !== undefined) {
      data.goal = this.parseOptionalString(body.goal, 'goal');
    }
    if (body.level !== undefined) {
      data.level = this.parseTrainingLevel(body.level);
    }
    if (body.durationWeeks !== undefined) {
      data.durationWeeks = this.parseDurationWeeks(body.durationWeeks);
    }
    if (body.generalNotes !== undefined) {
      data.generalNotes = this.parseOptionalString(
        body.generalNotes,
        'generalNotes',
      );
    }

    return data;
  }

  private parseCurrentAssignmentSessionUpdates(
    body: UpdateCurrentPlanAssignmentDto,
  ) {
    if (body.sessions === undefined) {
      return [];
    }

    if (!Array.isArray(body.sessions)) {
      throw new BadRequestException('sessions must be an array');
    }

    return body.sessions.map((session) => {
      const sessionId = this.parseRequiredString(session.sessionId, 'sessionId');
      const data: {
        name?: string;
        description?: string | null;
        coachNote?: string | null;
      } = {};

      if (session.name !== undefined) {
        data.name = this.parseRequiredString(session.name, 'name');
      }
      if (session.description !== undefined) {
        data.description = this.parseOptionalString(
          session.description,
          'description',
        );
      }
      if (session.coachNote !== undefined) {
        data.coachNote = this.parseOptionalString(
          session.coachNote,
          'coachNote',
        );
      }
      if (!Object.keys(data).length) {
        throw new BadRequestException('At least one session field is required');
      }

      return { sessionId, data };
    });
  }

  private parseCurrentAssignmentExerciseUpdates(
    body: UpdateCurrentPlanAssignmentDto,
  ) {
    if (body.exercises === undefined) {
      return [];
    }

    if (!Array.isArray(body.exercises)) {
      throw new BadRequestException('exercises must be an array');
    }

    return body.exercises.map((exercise) => {
      const sessionExerciseId = this.parseRequiredString(
        exercise.sessionExerciseId,
        'sessionExerciseId',
      );
      const data: {
        exerciseId?: string;
        orderIndex?: number;
        sets?: number | null;
        reps?: string;
        restSeconds?: number | null;
        coachNote?: string | null;
      } = {};

      if (exercise.exerciseId !== undefined) {
        data.exerciseId = this.parseRequiredString(
          exercise.exerciseId,
          'exerciseId',
        );
      }
      if (exercise.orderIndex !== undefined) {
        data.orderIndex = this.parseNonNegativeInt(
          exercise.orderIndex,
          'orderIndex',
        );
      }
      if (exercise.sets !== undefined) {
        data.sets = this.parseNullablePositiveInt(exercise.sets, 'sets');
      }
      if (exercise.reps !== undefined) {
        data.reps = this.parseRequiredString(exercise.reps, 'reps');
      }
      if (exercise.restSeconds !== undefined) {
        data.restSeconds = this.parseNullablePositiveInt(
          exercise.restSeconds,
          'restSeconds',
        );
      }
      if (exercise.coachNote !== undefined) {
        data.coachNote = this.parseOptionalString(
          exercise.coachNote,
          'coachNote',
        );
      }
      if (!Object.keys(data).length) {
        throw new BadRequestException('At least one exercise field is required');
      }

      return { sessionExerciseId, data };
    });
  }

  private async ensureAssignedSessionInPlan(
    sessionId: string,
    assignedPlanId: string,
  ) {
    const session = await this.prismaService.trainingSession.findFirst({
      where: {
        id: sessionId,
        day: {
          week: {
            trainingPlanId: assignedPlanId,
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('SESSION_NOT_FOUND_IN_ASSIGNED_PLAN');
    }
  }

  private async ensureAssignedSessionExerciseInPlan(
    sessionExerciseId: string,
    assignedPlanId: string,
  ) {
    const exercise = await this.prismaService.sessionExercise.findFirst({
      where: {
        id: sessionExerciseId,
        session: {
          day: {
            week: {
              trainingPlanId: assignedPlanId,
            },
          },
        },
      },
    });

    if (!exercise) {
      throw new NotFoundException('EXERCISE_NOT_FOUND_IN_ASSIGNED_PLAN');
    }
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
  }

  private async getSeedOrganizationId(): Promise<string | null> {
    const setting = await this.prismaService.systemSetting.findFirst({
      where: { key: 'system.seedOrganizationId' },
    });
    return (setting?.value as string | null) ?? null;
  }

  private isUniqueConstraintError(error: unknown) {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    );
  }

  private parseOptionalDate(value: unknown, field: string) {
    if (value === undefined) {
      return new Date();
    }

    if (typeof value !== 'string' || !value.trim()) {
      throw new BadRequestException(`${field} must be a valid date`);
    }

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`${field} must be a valid date`);
    }

    return parsed;
  }

  private parseDurationWeeks(value: unknown) {
    if (!Number.isInteger(value) || Number(value) < 1 || Number(value) > 52) {
      throw new BadRequestException('durationWeeks must be between 1 and 52');
    }

    return value as number;
  }

  private parseNonNegativeInt(value: unknown, field: string) {
    if (!Number.isInteger(value) || Number(value) < 0) {
      throw new BadRequestException(`${field} must be a non-negative integer`);
    }

    return value as number;
  }

  private parseNullablePositiveInt(value: unknown, field: string) {
    if (value === null || value === '') {
      return null;
    }

    if (!Number.isInteger(value) || Number(value) <= 0) {
      throw new BadRequestException(`${field} must be a positive integer`);
    }

    return value as number;
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

  private parseRequiredString(value: unknown, field: string) {
    if (typeof value !== 'string' || !value.trim()) {
      throw new BadRequestException(`${field} is required`);
    }

    return value.trim();
  }
}
