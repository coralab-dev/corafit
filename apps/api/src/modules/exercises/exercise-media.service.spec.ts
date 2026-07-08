import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import {
  Equipment,
  ExerciseMediaType,
  ExerciseStatus,
  OrganizationMemberRole,
  OrganizationMemberStatus,
  PrimaryMuscle,
  UserPlatformRole,
  UserStatus,
  type OrganizationMember,
  type User,
} from 'db';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import WebSocket from 'ws';
import type { PrismaService } from '../../common/prisma/prisma.service';
import { ExerciseMediaService } from './exercise-media.service';

const uploadMock = vi.fn();
const removeMock = vi.fn();
const getPublicUrlMock = vi.fn();
const getBucketMock = vi.fn();
const createBucketMock = vi.fn();
const updateBucketMock = vi.fn();
const resizeMock = vi.fn().mockReturnThis();
const rotateMock = vi.fn().mockReturnThis();
const webpMock = vi.fn().mockReturnThis();
const toBufferMock = vi.fn().mockResolvedValue(Buffer.from('optimized-image'));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    storage: {
      createBucket: createBucketMock,
      from: vi.fn(() => ({
        getPublicUrl: getPublicUrlMock,
        remove: removeMock,
        upload: uploadMock,
      })),
      getBucket: getBucketMock,
      updateBucket: updateBucketMock,
    },
  })),
}));

vi.mock('sharp', () => ({
  default: vi.fn(() => ({
    resize: resizeMock,
    rotate: rotateMock,
    toBuffer: toBufferMock,
    webp: webpMock,
  })),
}));

type PrismaServiceMock = {
  exercise: {
    findFirst: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};

function createConfigService() {
  return {
    get: vi.fn((key: string) => {
      const values: Record<string, string> = {
        SUPABASE_SERVICE_KEY: 'sb_secret_test',
        SUPABASE_URL: 'https://project.supabase.co',
      };

      return values[key];
    }),
  } as unknown as ConfigService;
}

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

function createUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-id',
    supabaseUserId: 'supabase-user-id',
    platformRole: UserPlatformRole.user,
    name: 'Coach Demo',
    email: 'coach@example.com',
    phone: null,
    status: UserStatus.active,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
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

function createFile(overrides: Partial<Express.Multer.File> = {}) {
  return {
    buffer: Buffer.from('image'),
    fieldname: 'image',
    mimetype: 'image/png',
    originalname: 'exercise.png',
    size: 1200,
    ...overrides,
  } as Express.Multer.File;
}

describe('ExerciseMediaService', () => {
  let prismaService: PrismaServiceMock;
  let service: ExerciseMediaService;

  beforeEach(() => {
    vi.clearAllMocks();
    resizeMock.mockReturnThis();
    rotateMock.mockReturnThis();
    webpMock.mockReturnThis();
    toBufferMock.mockResolvedValue(Buffer.from('optimized-image'));
    getBucketMock.mockResolvedValue({ data: { public: true }, error: null });
    uploadMock.mockResolvedValue({ data: { path: 'path' }, error: null });
    removeMock.mockResolvedValue({ data: [], error: null });
    getPublicUrlMock.mockReturnValue({
      data: {
        publicUrl:
          'https://project.supabase.co/storage/v1/object/public/exercise-media/exercises/exercise-id/file.webp',
      },
    });

    prismaService = {
      exercise: {
        findFirst: vi.fn().mockResolvedValue(createExercise()),
        update: vi.fn().mockResolvedValue(
          createExercise({
            mediaType: ExerciseMediaType.image,
            mediaUrl:
              'https://project.supabase.co/storage/v1/object/public/exercise-media/exercises/exercise-id/file.webp',
          }),
        ),
      },
    };
    service = new ExerciseMediaService(
      createConfigService(),
      prismaService as unknown as PrismaService,
    );
  });

  it('creates the Supabase client with websocket realtime transport', () => {
    expect(createSupabaseClient).toHaveBeenCalledWith(
      'https://project.supabase.co',
      'sb_secret_test',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
        realtime: {
          transport: WebSocket,
        },
      },
    );
  });

  it('uploads a valid custom exercise image as optimized WebP', async () => {
    const result = await service.uploadCustomExerciseImage(
      'exercise-id',
      createFile(),
      createMember(),
    );

    expect(uploadMock).toHaveBeenCalledWith(
      expect.stringMatching(/^exercises\/exercise-id\/.*\.webp$/),
      Buffer.from('optimized-image'),
      expect.objectContaining({ contentType: 'image/webp' }),
    );
    expect(resizeMock).toHaveBeenCalledWith({
      width: 1200,
      height: 1200,
      fit: 'inside',
      withoutEnlargement: true,
    });
    expect(webpMock).toHaveBeenCalledWith({ quality: 82 });
    const updateCall = prismaService.exercise.update.mock.calls[0]?.[0] as {
      data: { mediaType: ExerciseMediaType; mediaUrl: string; videoUrl?: string | null };
      where: { id: string };
    };
    expect(updateCall.where.id).toBe('exercise-id');
    expect(updateCall.data.mediaType).toBe(ExerciseMediaType.image);
    expect(updateCall.data.mediaUrl).toContain('/exercise-media/');
    expect(updateCall.data.videoUrl).toBeUndefined();
    expect(result.mediaType).toBe(ExerciseMediaType.image);
  });

  it.each(['image/jpeg', 'image/png', 'image/webp'])(
    'accepts %s uploads',
    async (mimetype) => {
      await service.uploadCustomExerciseImage(
        'exercise-id',
        createFile({ mimetype }),
        createMember(),
      );

      expect(uploadMock).toHaveBeenCalledWith(
        expect.stringMatching(/^exercises\/exercise-id\/.*\.webp$/),
        Buffer.from('optimized-image'),
        expect.objectContaining({ contentType: 'image/webp' }),
      );
    },
  );

  it('rejects invalid image formats', async () => {
    await expect(
      service.uploadCustomExerciseImage(
        'exercise-id',
        createFile({ mimetype: 'image/gif' }),
        createMember(),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(uploadMock).not.toHaveBeenCalled();
  });

  it('rejects images larger than 2 MB', async () => {
    await expect(
      service.uploadCustomExerciseImage(
        'exercise-id',
        createFile({ size: 2 * 1024 * 1024 + 1 }),
        createMember(),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(uploadMock).not.toHaveBeenCalled();
  });

  it('replaces an existing image and removes the previous storage object', async () => {
    prismaService.exercise.findFirst.mockResolvedValueOnce(
      createExercise({
        mediaUrl:
          'https://project.supabase.co/storage/v1/object/public/exercise-media/exercises/exercise-id/old.webp',
      }),
    );

    await service.uploadCustomExerciseImage(
      'exercise-id',
      createFile(),
      createMember(),
    );

    expect(uploadMock).toHaveBeenCalledTimes(1);
    expect(removeMock).toHaveBeenCalledWith(['exercises/exercise-id/old.webp']);
  });

  it('removes custom exercise media without changing video URL', async () => {
    prismaService.exercise.findFirst.mockResolvedValueOnce(
      createExercise({
        mediaType: ExerciseMediaType.image,
        mediaUrl:
          'https://project.supabase.co/storage/v1/object/public/exercise-media/exercises/exercise-id/current.webp',
        videoUrl: 'https://video.example.com/demo',
      }),
    );
    prismaService.exercise.update.mockResolvedValueOnce(
      createExercise({
        mediaType: null,
        mediaUrl: null,
        videoUrl: 'https://video.example.com/demo',
      }),
    );

    const result = await service.removeCustomExerciseMedia(
      'exercise-id',
      createMember(),
    );

    expect(prismaService.exercise.update).toHaveBeenCalledWith({
      where: { id: 'exercise-id' },
      data: {
        mediaType: null,
        mediaUrl: null,
      },
    });
    expect(removeMock).toHaveBeenCalledWith([
      'exercises/exercise-id/current.webp',
    ]);
    expect(result.videoUrl).toBe('https://video.example.com/demo');
  });

  it('rejects media edits for exercises from another organization', async () => {
    prismaService.exercise.findFirst.mockResolvedValueOnce(
      createExercise({ organizationId: 'other-organization-id' }),
    );

    await expect(
      service.uploadCustomExerciseImage(
        'exercise-id',
        createFile(),
        createMember(),
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('allows only platform admins to edit global exercise media', async () => {
    prismaService.exercise.findFirst.mockResolvedValueOnce(
      createExercise({ organizationId: null }),
    );

    await expect(
      service.uploadGlobalExerciseImage(
        'exercise-id',
        createFile(),
        createUser(),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    await service.uploadGlobalExerciseImage(
      'exercise-id',
      createFile(),
      createUser({ platformRole: UserPlatformRole.admin_saas }),
    );

    expect(uploadMock).toHaveBeenCalledTimes(1);
  });

  it('allows platform admins to remove global exercise media', async () => {
    prismaService.exercise.findFirst.mockResolvedValueOnce(
      createExercise({
        organizationId: null,
        mediaUrl:
          'https://project.supabase.co/storage/v1/object/public/exercise-media/exercises/exercise-id/global.webp',
      }),
    );

    await service.removeGlobalExerciseMedia(
      'exercise-id',
      createUser({ platformRole: UserPlatformRole.admin_saas }),
    );

    expect(prismaService.exercise.update).toHaveBeenCalledWith({
      where: { id: 'exercise-id' },
      data: {
        mediaType: null,
        mediaUrl: null,
      },
    });
    expect(removeMock).toHaveBeenCalledWith([
      'exercises/exercise-id/global.webp',
    ]);
  });
});
