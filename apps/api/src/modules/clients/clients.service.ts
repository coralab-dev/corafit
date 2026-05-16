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
} from './dto/client.dto';
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
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('ACTIVE_ASSIGNMENT_EXISTS');
      }

      throw error;
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

  private parseRequiredString(value: unknown, field: string) {
    if (typeof value !== 'string' || !value.trim()) {
      throw new BadRequestException(`${field} is required`);
    }

    return value.trim();
  }
}
