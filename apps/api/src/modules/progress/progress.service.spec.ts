/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import {
  ClientOperationalStatus,
  ClientType,
  FollowUpNoteVisibility,
  OrganizationMemberRole,
  OrganizationMemberStatus,
  ProgressPhotoType,
  ProgressRecordActor,
  type Client,
  type ClientAccess,
  type OrganizationMember,
} from 'db';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import WebSocket from 'ws';
import type { PrismaService } from '../../common/prisma/prisma.service';
import { ProgressService } from './progress.service';

const uploadMock = vi.fn();
const removeMock = vi.fn();
const createSignedUrlMock = vi.fn();
const getBucketMock = vi.fn();
const createBucketMock = vi.fn();
const updateBucketMock = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    storage: {
      createBucket: createBucketMock,
      from: vi.fn(() => ({
        createSignedUrl: createSignedUrlMock,
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
    resize: vi.fn().mockReturnThis(),
    rotate: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from('optimized-photo')),
    webp: vi.fn().mockReturnThis(),
  })),
}));

vi.mock('node:crypto', async (importOriginal) => ({
  ...(await importOriginal<typeof import('node:crypto')>()),
  randomUUID: vi.fn(() => 'photo-id'),
}));

type PrismaServiceMock = {
  client: {
    findFirst: ReturnType<typeof vi.fn>;
  };
  progressPhoto: {
    create: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  followUpNote: {
    create: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  weightLog: {
    create: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  bodyMeasurementLog: {
    create: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
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

function createMember(overrides: Partial<OrganizationMember> = {}): OrganizationMember {
  return {
    id: 'member-id',
    organizationId: 'organization-id',
    userId: 'user-id',
    role: OrganizationMemberRole.coach,
    status: OrganizationMemberStatus.active,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function createClient(overrides: Partial<Client> = {}): Client {
  return {
    id: 'client-id',
    organizationId: 'organization-id',
    assignedCoachMemberId: 'member-id',
    name: 'Client One',
    phone: null,
    age: null,
    sex: null,
    clientType: ClientType.online,
    mainGoal: 'Strength',
    heightCm: 170,
    initialWeightKg: 70,
    trainingLevel: null,
    injuriesNotes: null,
    generalNotes: null,
    canRegisterWeight: true,
    operationalStatus: ClientOperationalStatus.active,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function createAccess(client: Client): ClientAccess & { client: Client } {
  return {
    id: 'access-id',
    clientId: client.id,
    tokenHash: 'token-hash',
    pinHash: 'pin-hash',
    status: 'active',
    failedAttempts: 0,
    lockedUntil: null,
    lastAccessAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    client,
  };
}

describe('ProgressService', () => {
  let prismaService: PrismaServiceMock;
  let service: ProgressService;

  beforeEach(() => {
    vi.clearAllMocks();
    uploadMock.mockResolvedValue({ error: null });
    removeMock.mockResolvedValue({ error: null });
    createSignedUrlMock.mockResolvedValue({
      data: { signedUrl: 'https://signed.example/photo.webp' },
      error: null,
    });
    getBucketMock.mockResolvedValue({ data: { public: false } });
    prismaService = {
      client: {
        findFirst: vi.fn().mockResolvedValue(createClient()),
      },
      progressPhoto: {
        create: vi.fn().mockResolvedValue({
          id: 'photo-id',
          clientId: 'client-id',
          uploadedByType: ProgressRecordActor.coach,
          uploadedByMemberId: 'member-id',
          storagePath: 'progress-photos/organization-id/client-id/photo-id.webp',
          photoType: ProgressPhotoType.front,
          recordedAt: new Date('2026-06-01T00:00:00.000Z'),
          deletedAt: null,
          createdAt: new Date('2026-06-01T00:00:00.000Z'),
          updatedAt: new Date('2026-06-01T00:00:00.000Z'),
        }),
        findFirst: vi.fn().mockResolvedValue({
          id: 'photo-id',
          clientId: 'client-id',
          uploadedByType: ProgressRecordActor.client,
          uploadedByMemberId: null,
          storagePath: 'progress-photos/organization-id/client-id/photo-id.webp',
          photoType: ProgressPhotoType.front,
          recordedAt: new Date('2026-06-01T00:00:00.000Z'),
          deletedAt: null,
          createdAt: new Date('2026-06-01T00:00:00.000Z'),
          updatedAt: new Date('2026-06-01T00:00:00.000Z'),
        }),
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'photo-id',
            clientId: 'client-id',
            uploadedByType: ProgressRecordActor.client,
            uploadedByMemberId: null,
            storagePath: 'progress-photos/organization-id/client-id/photo-id.webp',
            photoType: ProgressPhotoType.front,
            recordedAt: new Date('2026-06-01T00:00:00.000Z'),
            deletedAt: null,
            createdAt: new Date('2026-06-01T00:00:00.000Z'),
            updatedAt: new Date('2026-06-01T00:00:00.000Z'),
          },
        ]),
        update: vi.fn().mockResolvedValue({ id: 'photo-id' }),
      },
      followUpNote: {
        create: vi.fn().mockResolvedValue({
          id: 'note-id',
          clientId: 'client-id',
          createdByMemberId: 'member-id',
          text: 'Check soreness',
          visibility: FollowUpNoteVisibility.private,
          deletedAt: null,
          createdAt: new Date('2026-06-01T00:00:00.000Z'),
          updatedAt: new Date('2026-06-01T00:00:00.000Z'),
        }),
        findFirst: vi.fn().mockResolvedValue({
          id: 'note-id',
          clientId: 'client-id',
          createdByMemberId: 'other-member-id',
          text: 'Other coach note',
          visibility: FollowUpNoteVisibility.private,
          deletedAt: null,
          createdAt: new Date('2026-06-01T00:00:00.000Z'),
          updatedAt: new Date('2026-06-01T00:00:00.000Z'),
        }),
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'note-id',
            clientId: 'client-id',
            createdByMemberId: 'member-id',
            text: 'Visible note',
            visibility: FollowUpNoteVisibility.visible_to_client,
            deletedAt: null,
            createdAt: new Date('2026-06-01T00:00:00.000Z'),
            updatedAt: new Date('2026-06-01T00:00:00.000Z'),
          },
        ]),
        update: vi.fn().mockResolvedValue({ id: 'note-id' }),
      },
      weightLog: {
        create: vi.fn().mockResolvedValue({ id: 'weight-log-id' }),
        findFirst: vi.fn().mockResolvedValue({
          id: 'weight-log-id',
          clientId: 'client-id',
          recordedByType: 'client',
          recordedByMemberId: null,
          deletedAt: null,
        }),
        findMany: vi.fn().mockResolvedValue([]),
        update: vi.fn().mockResolvedValue({ id: 'weight-log-id' }),
      },
      bodyMeasurementLog: {
        create: vi.fn().mockResolvedValue({ id: 'measurement-id' }),
        findFirst: vi.fn().mockResolvedValue({
          id: 'measurement-id',
          clientId: 'client-id',
          deletedAt: null,
        }),
        findMany: vi.fn().mockResolvedValue([]),
        update: vi.fn().mockResolvedValue({ id: 'measurement-id' }),
      },
    };
    service = new ProgressService(
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

  it('allows owner to list client weight logs in their organization', async () => {
    const owner = createMember({ role: OrganizationMemberRole.owner, id: 'owner-id' });

    await service.listWeightLogs('client-id', {}, owner);

    expect(prismaService.weightLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ clientId: 'client-id', deletedAt: null }),
        orderBy: [{ recordedAt: 'desc' }, { createdAt: 'desc' }],
      }),
    );
  });

  it('allows assigned coach to create a body measurement', async () => {
    const coach = createMember({ id: 'member-id', role: OrganizationMemberRole.coach });

    await service.createBodyMeasurement(
      'client-id',
      { waistCm: 80, recordedAt: '2026-06-01T00:00:00.000Z' },
      coach,
    );

    expect(prismaService.bodyMeasurementLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          clientId: 'client-id',
          recordedByMemberId: 'member-id',
          waistCm: 80,
          visibleToClient: false,
        }),
      }),
    );
  });

  it('forbids unassigned coach from sensitive progress', async () => {
    const coach = createMember({ id: 'other-member-id', role: OrganizationMemberRole.coach });

    await expect(service.listWeightLogs('client-id', {}, coach)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('requires canRegisterWeight before client creates weight', async () => {
    const client = createClient({ canRegisterWeight: false });

    await expect(
      service.createClientWeightLog(createAccess(client), { weightKg: 70 }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('forbids client from editing coach-created weight', async () => {
    prismaService.weightLog.findFirst.mockResolvedValue({
      id: 'weight-log-id',
      clientId: 'client-id',
      recordedByType: 'coach',
      recordedByMemberId: 'member-id',
      deletedAt: null,
    });

    await expect(
      service.updateClientWeightLog(createAccess(createClient()), 'weight-log-id', {
        weightKg: 71,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects empty client portal weight patch', async () => {
    await expect(
      service.updateClientWeightLog(createAccess(createClient()), 'weight-log-id', {}),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects empty weight patch', async () => {
    await expect(
      service.updateWeightLog('client-id', 'weight-log-id', {}, createMember()),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('only returns visible body measurements to client portal', async () => {
    await service.listClientBodyMeasurements(createAccess(createClient()), {});

    expect(prismaService.bodyMeasurementLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          clientId: 'client-id',
          deletedAt: null,
          visibleToClient: true,
        }),
      }),
    );
  });

  it('rejects empty body measurement patch', async () => {
    await expect(
      service.updateBodyMeasurement('client-id', 'measurement-id', {}, createMember()),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects body measurement create without measurements', async () => {
    await expect(
      service.createBodyMeasurement('client-id', { note: 'Only note' }, createMember()),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects body measurement create with only null measurements', async () => {
    await expect(
      service.createBodyMeasurement('client-id', { waistCm: null, hipCm: null }, createMember()),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('soft deletes weight and excludes deleted records from lists', async () => {
    const owner = createMember({ role: OrganizationMemberRole.owner, id: 'owner-id' });

    await service.deleteWeightLog('client-id', 'weight-log-id', owner);
    await service.listWeightLogs('client-id', {}, owner);

    expect(prismaService.weightLog.update).toHaveBeenCalledWith({
      where: { id: 'weight-log-id' },
      data: { deletedAt: expect.any(Date) },
    });
    expect(prismaService.weightLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ deletedAt: null }),
      }),
    );
  });

  it('allows owner to list client photos with signed URLs', async () => {
    const owner = createMember({ role: OrganizationMemberRole.owner, id: 'owner-id' });

    const result = await service.listPhotos('client-id', {}, owner);

    expect(prismaService.progressPhoto.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ clientId: 'client-id', deletedAt: null }),
        orderBy: [{ recordedAt: 'desc' }, { createdAt: 'desc' }],
      }),
    );
    expect(createSignedUrlMock).toHaveBeenCalledWith(
      'progress-photos/organization-id/client-id/photo-id.webp',
      3600,
    );
    expect(result[0]).toEqual(
      expect.objectContaining({
        signedUrl: 'https://signed.example/photo.webp',
        storagePath: 'progress-photos/organization-id/client-id/photo-id.webp',
      }),
    );
  });

  it('allows assigned coach to list and upload photos using storagePath only', async () => {
    const coach = createMember({ id: 'member-id', role: OrganizationMemberRole.coach });
    const file = createFile();

    await service.listPhotos('client-id', {}, coach);
    await service.createPhoto('client-id', { photoType: 'front' }, file, coach);

    expect(prismaService.progressPhoto.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        clientId: 'client-id',
        uploadedByType: ProgressRecordActor.coach,
        uploadedByMemberId: 'member-id',
        storagePath: 'progress-photos/organization-id/client-id/photo-id.webp',
        photoType: ProgressPhotoType.front,
      }),
    });
    const createPhotoCall = prismaService.progressPhoto.create.mock.calls[0]?.[0] as {
      data: Record<string, unknown>;
    };
    expect(createPhotoCall.data).not.toHaveProperty('url');
    expect(uploadMock).toHaveBeenCalledWith(
      'progress-photos/organization-id/client-id/photo-id.webp',
      Buffer.from('optimized-photo'),
      expect.objectContaining({ contentType: 'image/webp' }),
    );
  });

  it('forbids unassigned coach from listing photos', async () => {
    const coach = createMember({ id: 'other-member-id', role: OrganizationMemberRole.coach });

    await expect(service.listPhotos('client-id', {}, coach)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('allows client to list own photos without exposing storage paths', async () => {
    const result = await service.listClientPhotos(createAccess(createClient()), {});

    expect(prismaService.progressPhoto.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ clientId: 'client-id', deletedAt: null }),
      }),
    );
    expect(result[0]).toEqual(expect.objectContaining({
      id: 'photo-id',
      photoType: ProgressPhotoType.front,
      recordedAt: expect.any(Date),
      signedUrl: 'https://signed.example/photo.webp',
      uploadedByType: ProgressRecordActor.client,
    }));
    expect(result[0]).not.toHaveProperty('storagePath');
  });

  it('omits a missing storage object and reconciles its database row', async () => {
    const missingPhoto = {
      id: 'missing-photo-id',
      clientId: 'client-id',
      uploadedByType: ProgressRecordActor.client,
      uploadedByMemberId: null,
      storagePath: 'progress-photos/organization-id/client-id/missing-photo-id.webp',
      photoType: ProgressPhotoType.front,
      recordedAt: new Date('2026-06-02T00:00:00.000Z'),
      deletedAt: null,
      createdAt: new Date('2026-06-02T00:00:00.000Z'),
      updatedAt: new Date('2026-06-02T00:00:00.000Z'),
    };
    const validPhoto = {
      ...missingPhoto,
      id: 'valid-photo-id',
      storagePath: 'progress-photos/organization-id/client-id/valid-photo-id.webp',
    };
    prismaService.progressPhoto.findMany.mockResolvedValueOnce([missingPhoto, validPhoto]);
    createSignedUrlMock
      .mockResolvedValueOnce({
        data: null,
        error: { code: 'NoSuchKey', message: 'Object not found', statusCode: '404' },
      })
      .mockResolvedValueOnce({
        data: { signedUrl: 'https://signed.example/valid.webp' },
        error: null,
      });

    const result = await service.listClientPhotos(createAccess(createClient()), {});

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(expect.objectContaining({ id: 'valid-photo-id' }));
    expect(prismaService.progressPhoto.update).toHaveBeenCalledWith({
      where: { id: 'missing-photo-id' },
      data: { deletedAt: expect.any(Date) },
    });
  });

  it.each([
    ['NoSuchBucket', { code: 'NoSuchBucket', statusCode: '404' }],
    ['TenantNotFound', { code: 'TenantNotFound', statusCode: '404' }],
    ['Unauthorized', { code: 'Unauthorized', statusCode: '403' }],
    ['ambiguous 404', { statusCode: '404', message: 'Object not found' }],
    ['server error', { code: 'InternalError', statusCode: '500' }],
  ])('propagates %s without reconciling the database row', async (_name, error) => {
    createSignedUrlMock.mockResolvedValueOnce({ data: null, error });

    await expect(
      service.listClientPhotos(createAccess(createClient()), {}),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prismaService.progressPhoto.update).not.toHaveBeenCalled();
  });

  it('propagates general signed URL errors instead of reconciling them', async () => {
    createSignedUrlMock.mockResolvedValueOnce({
      data: null,
      error: { message: 'Storage service unavailable', statusCode: '500' },
    });

    await expect(
      service.listClientPhotos(createAccess(createClient()), {}),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prismaService.progressPhoto.update).not.toHaveBeenCalled();
  });

  it('does not soft delete a photo when strict storage removal fails', async () => {
    removeMock.mockResolvedValueOnce({ error: { message: 'storage unavailable' } });

    await expect(
      service.deleteClientPhoto(createAccess(createClient()), 'photo-id'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prismaService.progressPhoto.update).not.toHaveBeenCalled();
  });

  it('removes storage before soft deleting a client photo', async () => {
    removeMock.mockImplementationOnce(() => {
      expect(prismaService.progressPhoto.update).not.toHaveBeenCalled();
      return { error: null };
    });

    await service.deleteClientPhoto(createAccess(createClient()), 'photo-id');

    expect(removeMock).toHaveBeenCalledWith([
      'progress-photos/organization-id/client-id/photo-id.webp',
    ]);
    expect(prismaService.progressPhoto.update).toHaveBeenCalledWith({
      where: { id: 'photo-id' },
      data: { deletedAt: expect.any(Date) },
    });
  });

  it('retries the database tombstone after storage removal', async () => {
    const prismaError = new Error('temporary database failure');
    prismaService.progressPhoto.update
      .mockRejectedValueOnce(prismaError)
      .mockResolvedValueOnce({ id: 'photo-id' });

    await service.deleteClientPhoto(createAccess(createClient()), 'photo-id');

    expect(prismaService.progressPhoto.update).toHaveBeenCalledTimes(2);
  });

  it('logs deletion reconciliation context and preserves the database error after retries', async () => {
    const prismaError = new Error('database unavailable');
    const loggerError = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    prismaService.progressPhoto.update.mockRejectedValue(prismaError);

    try {
      await expect(
        service.deleteClientPhoto(createAccess(createClient()), 'photo-id'),
      ).rejects.toBe(prismaError);
      expect(prismaService.progressPhoto.update).toHaveBeenCalledTimes(3);
      expect(loggerError).toHaveBeenCalledWith(
        'photo deletion reconciliation failed',
        expect.stringContaining('"photoId":"photo-id"'),
      );
    } finally {
      loggerError.mockRestore();
    }
  });

  it('tries to compensate an orphaned coach upload when Prisma create fails', async () => {
    const prismaError = new Error('database unavailable');
    prismaService.progressPhoto.create.mockRejectedValueOnce(prismaError);

    await expect(
      service.createPhoto('client-id', { photoType: 'front' }, createFile(), createMember()),
    ).rejects.toBe(prismaError);
    expect(removeMock).toHaveBeenCalledWith([
      'progress-photos/organization-id/client-id/photo-id.webp',
    ]);
  });

  it('logs compensation failures while preserving the original Prisma error', async () => {
    const prismaError = new Error('database unavailable');
    const storageError = new Error('storage cleanup unavailable');
    const loggerError = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    prismaService.progressPhoto.create.mockRejectedValueOnce(prismaError);
    removeMock.mockResolvedValueOnce({ error: storageError });

    try {
      await expect(
        service.createClientPhoto(createAccess(createClient()), { photoType: 'front' }, createFile()),
      ).rejects.toBe(prismaError);
      expect(loggerError).toHaveBeenCalledWith(
        expect.stringContaining('photo cleanup failed'),
        storageError,
      );
    } finally {
      loggerError.mockRestore();
    }
  });

  it('does not expose storage paths from a client photo upload', async () => {
    prismaService.progressPhoto.create.mockResolvedValueOnce({
      id: 'photo-id',
      clientId: 'client-id',
      uploadedByType: ProgressRecordActor.client,
      uploadedByMemberId: null,
      storagePath: 'progress-photos/organization-id/client-id/photo-id.webp',
      photoType: ProgressPhotoType.front,
      recordedAt: new Date('2026-06-01T00:00:00.000Z'),
      deletedAt: null,
      createdAt: new Date('2026-06-01T00:00:00.000Z'),
      updatedAt: new Date('2026-06-01T00:00:00.000Z'),
    });
    const result = await service.createClientPhoto(
      createAccess(createClient()),
      { photoType: 'front' },
      createFile(),
    );

    expect(result).toEqual(expect.objectContaining({
      id: 'photo-id',
      photoType: ProgressPhotoType.front,
      signedUrl: 'https://signed.example/photo.webp',
      uploadedByType: ProgressRecordActor.client,
    }));
    expect(result).not.toHaveProperty('storagePath');
  });

  it('forbids client from deleting coach uploaded photos', async () => {
    prismaService.progressPhoto.findFirst.mockResolvedValue({
      id: 'photo-id',
      clientId: 'client-id',
      uploadedByType: ProgressRecordActor.coach,
      uploadedByMemberId: 'member-id',
      storagePath: 'progress-photos/organization-id/client-id/photo-id.webp',
      deletedAt: null,
    });

    await expect(
      service.deleteClientPhoto(createAccess(createClient()), 'photo-id'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('forbids coach from deleting client uploaded photos', async () => {
    const coach = createMember({ id: 'member-id', role: OrganizationMemberRole.coach });

    await expect(service.deletePhoto('client-id', 'photo-id', coach)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('allows owner to delete any organization photo', async () => {
    const owner = createMember({ id: 'owner-id', role: OrganizationMemberRole.owner });

    await service.deletePhoto('client-id', 'photo-id', owner);

    expect(prismaService.progressPhoto.update).toHaveBeenCalledWith({
      where: { id: 'photo-id' },
      data: { deletedAt: expect.any(Date) },
    });
  });

  it('rejects invalid upload mime', async () => {
    await expect(
      service.createPhoto(
        'client-id',
        {},
        createFile({ mimetype: 'application/pdf' }),
        createMember(),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows owner to list client follow-up notes', async () => {
    const owner = createMember({ id: 'owner-id', role: OrganizationMemberRole.owner });

    await service.listNotes('client-id', { limit: '75' }, owner);

    expect(prismaService.followUpNote.findMany).toHaveBeenCalledWith({
      where: {
        clientId: 'client-id',
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
      take: 75,
    });
  });

  it('allows assigned coach to create a follow-up note', async () => {
    await service.createNote(
      'client-id',
      { text: '  Check soreness  ', visibility: 'visible_to_client' },
      createMember(),
    );

    expect(prismaService.followUpNote.create).toHaveBeenCalledWith({
      data: {
        clientId: 'client-id',
        createdByMemberId: 'member-id',
        text: 'Check soreness',
        visibility: FollowUpNoteVisibility.visible_to_client,
      },
    });
  });

  it('forbids unassigned coach from follow-up notes', async () => {
    const coach = createMember({ id: 'other-member-id', role: OrganizationMemberRole.coach });

    await expect(service.listNotes('client-id', {}, coach)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('only returns visible follow-up notes to client portal', async () => {
    await service.listClientNotes(createAccess(createClient()), {});

    expect(prismaService.followUpNote.findMany).toHaveBeenCalledWith({
      where: {
        clientId: 'client-id',
        deletedAt: null,
        visibility: FollowUpNoteVisibility.visible_to_client,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  });

  it('forbids coach from editing another coach follow-up note', async () => {
    await expect(
      service.updateNote('client-id', 'note-id', { text: 'Update' }, createMember()),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows owner to edit another coach follow-up note', async () => {
    const owner = createMember({ id: 'owner-id', role: OrganizationMemberRole.owner });

    await service.updateNote('client-id', 'note-id', { text: ' Owner note ' }, owner);

    expect(prismaService.followUpNote.update).toHaveBeenCalledWith({
      where: { id: 'note-id' },
      data: { text: 'Owner note' },
    });
  });

  it('soft deletes follow-up notes', async () => {
    prismaService.followUpNote.findFirst.mockResolvedValue({
      id: 'note-id',
      clientId: 'client-id',
      createdByMemberId: 'member-id',
      deletedAt: null,
    });

    await service.deleteNote('client-id', 'note-id', createMember());

    expect(prismaService.followUpNote.update).toHaveBeenCalledWith({
      where: { id: 'note-id' },
      data: { deletedAt: expect.any(Date) },
    });
  });

  it('rejects follow-up note create without text', async () => {
    await expect(
      service.createNote('client-id', { visibility: 'private' }, createMember()),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects empty follow-up note patch', async () => {
    prismaService.followUpNote.findFirst.mockResolvedValue({
      id: 'note-id',
      clientId: 'client-id',
      createdByMemberId: 'member-id',
      deletedAt: null,
    });

    await expect(
      service.updateNote('client-id', 'note-id', {}, createMember()),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects invalid follow-up note visibility', async () => {
    await expect(
      service.createNote('client-id', { text: 'Note', visibility: 'public' }, createMember()),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

function createFile(overrides: Partial<Express.Multer.File> = {}) {
  return {
    buffer: Buffer.from('raw-photo'),
    mimetype: 'image/jpeg',
    originalname: 'photo.jpg',
    size: 1024,
    ...overrides,
  } as Express.Multer.File;
}
