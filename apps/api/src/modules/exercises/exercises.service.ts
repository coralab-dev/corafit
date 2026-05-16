import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateExerciseDto,
  ListExercisesQuery,
  UpdateExerciseDto,
} from './dto/exercise.dto';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { OrganizationMember } from 'db';
import {
  Equipment,
  ExerciseMediaType,
  ExerciseStatus,
  PrimaryMuscle,
  type Prisma,
} from 'db';

type ExerciseTypeFilter = 'global' | 'custom' | 'all';

const exerciseTypeFilters = ['global', 'custom', 'all'] as const;
const equipmentValues = Object.values(Equipment);
const mediaTypeValues = Object.values(ExerciseMediaType);
const muscleValues = Object.values(PrimaryMuscle);
const statusValues = Object.values(ExerciseStatus);

@Injectable()
export class ExercisesService {
  constructor(private readonly prismaService: PrismaService) {}

  async list(
    query: ListExercisesQuery,
    member: OrganizationMember | undefined,
  ) {
    if (!member) {
      throw new ForbiddenException('Organization membership is required');
    }

    const organizationId = member.organizationId;
    const page = this.parsePositiveInt(query.page, 1);
    const limit = Math.min(this.parsePositiveInt(query.limit, 20), 100);
    const search = query.search?.trim();

    const typeFilter = this.parseTypeFilter(query.type);
    const statusFilter = this.parseStatus(query.status, false) ?? ExerciseStatus.active;
    const primaryMuscle = this.parsePrimaryMuscle(query.primaryMuscle, false);
    const equipment = this.parseEquipment(query.equipment, false);

    const baseWhere: Prisma.ExerciseWhereInput = {
      status: statusFilter,
    };

    if (search) {
      baseWhere.name = { contains: search, mode: 'insensitive' };
    }
    if (primaryMuscle) {
      baseWhere.primaryMuscle = primaryMuscle;
    }
    if (equipment) {
      baseWhere.equipment = equipment;
    }

    if (typeFilter === 'global') {
      baseWhere.organizationId = null;
    } else if (typeFilter === 'custom') {
      baseWhere.organizationId = organizationId;
    } else {
      baseWhere.OR = [
        { organizationId: null },
        { organizationId },
      ];
    }

    const [items, total] = await this.prismaService.$transaction([
      this.prismaService.exercise.findMany({
        where: baseWhere,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prismaService.exercise.count({
        where: baseWhere,
      }),
    ]);

    return { items, page, limit, total };
  }

  async getById(exerciseId: string, member: OrganizationMember | undefined) {
    if (!member) {
      throw new ForbiddenException('Organization membership is required');
    }

    const organizationId = member.organizationId;
    const exercise = await this.prismaService.exercise.findFirst({
      where: {
        id: exerciseId,
        OR: [{ organizationId: null }, { organizationId }],
      },
    });

    if (!exercise) {
      throw new NotFoundException('Exercise was not found');
    }

    return exercise;
  }

  async createCustom(
    body: CreateExerciseDto,
    member: OrganizationMember | undefined,
  ) {
    if (!member) {
      throw new ForbiddenException('Organization membership is required');
    }

    const data = this.parseExerciseData(body, true);
    const organizationId = member.organizationId;

    try {
      return await this.prismaService.exercise.create({
        data: {
          name: data.name,
          primaryMuscle: data.primaryMuscle,
          secondaryMuscles: data.secondaryMuscles ?? [],
          equipment: data.equipment,
          instructions: data.instructions,
          recommendations: data.recommendations,
          mediaUrl: data.mediaUrl,
          mediaType: data.mediaType,
          organizationId,
          createdByUserId: member.userId,
        },
      });
    } catch (error) {
      this.handleUniqueConflict(error);
    }
  }

  async update(
    exerciseId: string,
    body: UpdateExerciseDto,
    member: OrganizationMember | undefined,
  ) {
    if (!member) {
      throw new ForbiddenException('Organization membership is required');
    }

    const exercise = await this.prismaService.exercise.findFirst({
      where: { id: exerciseId },
    });

    if (!exercise) {
      throw new NotFoundException('Exercise was not found or is not editable');
    }

    if (exercise.organizationId === null) {
      throw new ForbiddenException('Global exercises cannot be edited');
    }

    if (exercise.organizationId !== member.organizationId) {
      throw new NotFoundException('Exercise was not found or is not editable');
    }

    const data = this.parseUpdateData(body);

    try {
      return await this.prismaService.exercise.update({
        where: { id: exerciseId },
        data,
      });
    } catch (error) {
      this.handleUniqueConflict(error);
    }
  }

  async delete(exerciseId: string, member: OrganizationMember | undefined) {
    if (!member) {
      throw new ForbiddenException('Organization membership is required');
    }

    const exercise = await this.prismaService.exercise.findFirst({
      where: { id: exerciseId },
    });

    if (!exercise) {
      throw new NotFoundException('Exercise was not found or is not deletable');
    }

    if (exercise.organizationId === null) {
      throw new ForbiddenException('Global exercises cannot be deleted');
    }

    if (exercise.organizationId !== member.organizationId) {
      throw new NotFoundException('Exercise was not found or is not deletable');
    }

    return this.prismaService.exercise.update({
      where: { id: exerciseId },
      data: { status: ExerciseStatus.inactive },
    });
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

  private parseExerciseData(body: Partial<CreateExerciseDto>, required: boolean) {
    const name = this.parseString(body.name, 'name', required);
    const primaryMuscle = this.parsePrimaryMuscle(body.primaryMuscle, required);
    const equipment = this.parseEquipment(body.equipment, required);

    const result: {
      name: string;
      primaryMuscle: PrimaryMuscle;
      equipment: Equipment;
      secondaryMuscles?: string[];
      instructions?: string | null;
      recommendations?: string | null;
      mediaUrl?: string | null;
      mediaType?: ExerciseMediaType | null;
    } = {
      name: name as string,
      primaryMuscle: primaryMuscle as PrimaryMuscle,
      equipment: equipment as Equipment,
    };

    if (body.secondaryMuscles !== undefined) {
      result.secondaryMuscles = this.parseOptionalStringArray(body.secondaryMuscles, 'secondaryMuscles');
    }
    if (body.instructions !== undefined) {
      result.instructions = this.parseOptionalString(body.instructions, 'instructions');
    }
    if (body.recommendations !== undefined) {
      result.recommendations = this.parseOptionalString(body.recommendations, 'recommendations');
    }
    if (body.mediaUrl !== undefined) {
      result.mediaUrl = this.parseOptionalString(body.mediaUrl, 'mediaUrl');
    }
    if (body.mediaType !== undefined) {
      result.mediaType = this.parseMediaType(body.mediaType, false);
    }

    return result;
  }

  private parseUpdateData(body: Partial<UpdateExerciseDto>) {
    const result: Prisma.ExerciseUpdateInput = {};

    if (body.name !== undefined) {
      result.name = this.parseString(body.name, 'name', true);
    }
    if (body.primaryMuscle !== undefined) {
      result.primaryMuscle = this.parsePrimaryMuscle(body.primaryMuscle, true);
    }
    if (body.secondaryMuscles !== undefined) {
      result.secondaryMuscles = this.parseOptionalStringArray(body.secondaryMuscles, 'secondaryMuscles');
    }
    if (body.equipment !== undefined) {
      result.equipment = this.parseEquipment(body.equipment, true);
    }
    if (body.instructions !== undefined) {
      result.instructions = this.parseOptionalString(body.instructions, 'instructions');
    }
    if (body.recommendations !== undefined) {
      result.recommendations = this.parseOptionalString(body.recommendations, 'recommendations');
    }
    if (body.mediaUrl !== undefined) {
      result.mediaUrl = body.mediaUrl === null ? null : this.parseOptionalString(body.mediaUrl, 'mediaUrl');
    }
    if (body.mediaType !== undefined) {
      result.mediaType = body.mediaType === null ? null : this.parseMediaType(body.mediaType, false);
    }
    if (body.status !== undefined) {
      result.status = this.parseStatus(body.status, true);
    }

    return result;
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

  private parseOptionalString(value: unknown, field: string) {
    if (value === null) {
      return null;
    }

    if (typeof value !== 'string') {
      throw new BadRequestException(`${field} must be a string`);
    }

    const trimmed = value.trim();
    return trimmed || null;
  }

  private parseOptionalStringArray(value: unknown, field: string) {
    if (!Array.isArray(value)) {
      throw new BadRequestException(`${field} must be an array`);
    }

    return value.map((v) => {
      if (typeof v !== 'string') {
        throw new BadRequestException(`${field} must contain strings`);
      }
      return v.trim();
    });
  }

  private parsePrimaryMuscle(value: unknown, required: boolean) {
    if (value === undefined && !required) {
      return undefined;
    }

    if (typeof value !== 'string' || !muscleValues.includes(value as PrimaryMuscle)) {
      throw new BadRequestException('primaryMuscle is invalid');
    }

    return value as PrimaryMuscle;
  }

  private parseEquipment(value: unknown, required: boolean) {
    if (value === undefined && !required) {
      return undefined;
    }

    if (typeof value !== 'string' || !equipmentValues.includes(value as Equipment)) {
      throw new BadRequestException('equipment is invalid');
    }

    return value as Equipment;
  }

  private parseMediaType(value: unknown, required: boolean) {
    if (value === undefined && !required) {
      return undefined;
    }

    if (
      typeof value !== 'string' ||
      !mediaTypeValues.includes(value as ExerciseMediaType)
    ) {
      throw new BadRequestException('mediaType must be image or video_url');
    }

    return value as ExerciseMediaType;
  }

  private parseStatus(value: unknown, required: boolean) {
    if (value === undefined && !required) {
      return undefined;
    }

    if (typeof value !== 'string' || !statusValues.includes(value as ExerciseStatus)) {
      throw new BadRequestException('status is invalid');
    }

    return value as ExerciseStatus;
  }

  private parseTypeFilter(value: unknown): ExerciseTypeFilter {
    if (value === undefined) {
      return 'all';
    }

    if (
      typeof value !== 'string' ||
      !exerciseTypeFilters.includes(value as ExerciseTypeFilter)
    ) {
      throw new BadRequestException('type is invalid');
    }

    return value as ExerciseTypeFilter;
  }

  private handleUniqueConflict(error: unknown): never {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Exercise name already exists');
    }

    throw error;
  }
}
