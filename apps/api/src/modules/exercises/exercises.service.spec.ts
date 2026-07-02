/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  Equipment,
  ExerciseMediaType,
  ExerciseStatus,
  OrganizationMemberRole,
  OrganizationMemberStatus,
  PrimaryMuscle,
  type OrganizationMember,
} from 'db';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../common/prisma/prisma.service';
import { ExercisesService } from './exercises.service';

type PrismaServiceMock = {
  $transaction: ReturnType<typeof vi.fn>;
  exercise: {
    count: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};

function createMember(): OrganizationMember {
  return {
    id: 'member-id',
    organizationId: 'organization-id',
    userId: 'user-id',
    role: OrganizationMemberRole.owner,
    status: OrganizationMemberStatus.active,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };
}

function createExercise(overrides = {}) {
  return {
    id: 'exercise-id',
    organizationId: 'organization-id',
    createdByUserId: 'user-id',
    name: 'Press inclinado',
    primaryMuscle: PrimaryMuscle.chest,
    secondaryMuscles: [],
    equipment: Equipment.dumbbell,
    instructions: null,
    recommendations: null,
    mediaUrl: null,
    mediaType: null,
    videoUrl: null,
    status: ExerciseStatus.active,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('ExercisesService', () => {
  let prismaService: PrismaServiceMock;
  let service: ExercisesService;

  beforeEach(() => {
    prismaService = {
      $transaction: vi.fn(async (operations: Array<Promise<unknown>>) =>
        Promise.all(operations),
      ),
      exercise: {
        count: vi.fn().mockResolvedValue(1),
        create: vi.fn().mockResolvedValue(createExercise()),
        findFirst: vi.fn().mockResolvedValue(createExercise()),
        findMany: vi.fn().mockResolvedValue([createExercise()]),
        update: vi.fn().mockResolvedValue(
          createExercise({ status: ExerciseStatus.inactive }),
        ),
      },
    };
    service = new ExercisesService(prismaService as unknown as PrismaService);
  });

  it('creates a custom exercise in the current organization', async () => {
    await service.createCustom(
      {
        name: ' Press inclinado ',
        primaryMuscle: PrimaryMuscle.chest,
        secondaryMuscles: ['triceps'],
        equipment: Equipment.dumbbell,
        mediaType: ExerciseMediaType.image,
      },
      createMember(),
    );

    expect(prismaService.exercise.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        createdByUserId: 'user-id',
        equipment: Equipment.dumbbell,
        mediaType: ExerciseMediaType.image,
        name: 'Press inclinado',
        organizationId: 'organization-id',
        primaryMuscle: PrimaryMuscle.chest,
      }),
    });
  });

  it('creates a global exercise without an organization', async () => {
    await service.createGlobal({
      name: ' Sentadilla goblet ',
      primaryMuscle: PrimaryMuscle.legs,
      secondaryMuscles: ['glute'],
      equipment: Equipment.dumbbell,
      mediaType: ExerciseMediaType.video_url,
      mediaUrl: 'https://example.com/video',
      videoUrl: 'https://example.com/video',
    });

    expect(prismaService.exercise.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        equipment: Equipment.dumbbell,
        mediaType: ExerciseMediaType.video_url,
        mediaUrl: 'https://example.com/video',
        name: 'Sentadilla goblet',
        organizationId: null,
        primaryMuscle: PrimaryMuscle.legs,
        videoUrl: 'https://example.com/video',
      }),
    });
  });

  it('stores a video URL separately from image media on update', async () => {
    prismaService.exercise.findFirst.mockResolvedValueOnce(
      createExercise({
        mediaType: ExerciseMediaType.image,
        mediaUrl: 'https://cdn.example.com/image.webp',
      }),
    );

    await service.updateGlobal('exercise-id', { videoUrl: ' https://example.com/demo ' });

    expect(prismaService.exercise.update).toHaveBeenCalledWith({
      where: { id: 'exercise-id' },
      data: { videoUrl: 'https://example.com/demo' },
    });
  });

  it('lists active global and organization exercises by default', async () => {
    await service.list({}, createMember());

    expect(prismaService.exercise.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [{ organizationId: null }, { organizationId: 'organization-id' }],
          status: ExerciseStatus.active,
        }),
      }),
    );
  });

  it('lists global exercises for admin without organization scope', async () => {
    await service.listGlobal({ status: ExerciseStatus.inactive });

    expect(prismaService.exercise.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: null,
          status: ExerciseStatus.inactive,
        }),
      }),
    );
  });

  it('rejects invalid list filters with BadRequestException', async () => {
    await expect(
      service.list({ type: 'invalid' as never }, createMember()),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.list({ status: 'invalid' }, createMember()),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.list({ primaryMuscle: 'invalid' }, createMember()),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.list({ equipment: 'invalid' }, createMember()),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws ForbiddenException when updating a global exercise', async () => {
    prismaService.exercise.findFirst.mockResolvedValueOnce(
      createExercise({ organizationId: null }),
    );

    await expect(
      service.update('exercise-id', { name: 'New name' }, createMember()),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('updates a global exercise for admin', async () => {
    prismaService.exercise.findFirst.mockResolvedValueOnce(
      createExercise({ organizationId: null }),
    );

    await service.updateGlobal('exercise-id', { name: 'New global name' });

    expect(prismaService.exercise.update).toHaveBeenCalledWith({
      where: { id: 'exercise-id' },
      data: { name: 'New global name' },
    });
  });

  it('throws ForbiddenException when deleting a global exercise', async () => {
    prismaService.exercise.findFirst.mockResolvedValueOnce(
      createExercise({ organizationId: null }),
    );

    await expect(
      service.delete('exercise-id', createMember()),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('soft deletes global exercises by marking them inactive', async () => {
    prismaService.exercise.findFirst.mockResolvedValueOnce(
      createExercise({ organizationId: null }),
    );

    await service.deleteGlobal('exercise-id');

    expect(prismaService.exercise.update).toHaveBeenCalledWith({
      where: { id: 'exercise-id' },
      data: { status: ExerciseStatus.inactive },
    });
  });

  it('throws NotFoundException when updating an exercise from another organization', async () => {
    prismaService.exercise.findFirst.mockResolvedValueOnce(
      createExercise({ organizationId: 'other-organization-id' }),
    );

    await expect(
      service.update('exercise-id', { name: 'New name' }, createMember()),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('soft deletes custom exercises by marking them inactive', async () => {
    await service.delete('exercise-id', createMember());

    expect(prismaService.exercise.update).toHaveBeenCalledWith({
      where: { id: 'exercise-id' },
      data: { status: ExerciseStatus.inactive },
    });
  });

  it('throws ConflictException when Prisma reports a unique conflict on create', async () => {
    prismaService.exercise.create.mockRejectedValueOnce({ code: 'P2002' });

    await expect(
      service.createCustom(
        {
          name: 'Press inclinado',
          primaryMuscle: PrimaryMuscle.chest,
          equipment: Equipment.dumbbell,
        },
        createMember(),
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws ConflictException when Prisma reports a unique conflict on update', async () => {
    prismaService.exercise.update.mockRejectedValueOnce({ code: 'P2002' });

    await expect(
      service.update('exercise-id', { name: 'Press inclinado' }, createMember()),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
