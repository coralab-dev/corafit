import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import {
  OrganizationMemberRole,
  ProgressPhotoType,
  ProgressRecordActor,
  type Client,
  type ClientAccess,
  type OrganizationMember,
  type ProgressPhoto,
} from 'db';
import type { AppConfig } from '../../config/env.schema';
import { PrismaService } from '../../common/prisma/prisma.service';

export type ProgressListQuery = {
  from?: string;
  limit?: string | number;
  to?: string;
};

export type WeightLogDto = {
  note?: string | null;
  recordedAt?: string;
  weightKg?: number | string;
};

export type BodyMeasurementDto = {
  armCm?: number | string | null;
  chestCm?: number | string | null;
  gluteCm?: number | string | null;
  hipCm?: number | string | null;
  legCm?: number | string | null;
  note?: string | null;
  recordedAt?: string;
  visibleToClient?: boolean | string;
  waistCm?: number | string | null;
};

export type ProgressPhotoDto = {
  photoType?: string;
  recordedAt?: string;
};

type SupabaseDatabase = {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

type ClientPortalAccessWithClient = ClientAccess & { client: Client };
type DateRange = { gte?: Date; lte?: Date };
type MeasurementField = 'armCm' | 'chestCm' | 'gluteCm' | 'hipCm' | 'legCm' | 'waistCm';
type ParsedCommonFields = { note?: string | null; recordedAt?: Date };
type ParsedWeightLogCreate = ParsedCommonFields & { weightKg: number };
type ParsedWeightLogUpdate = ParsedCommonFields & { weightKg?: number };

const measurementFields: MeasurementField[] = [
  'armCm',
  'chestCm',
  'gluteCm',
  'hipCm',
  'legCm',
  'waistCm',
];
const progressPhotosBucketName = 'progress-photos';
const signedUrlExpiresInSeconds = 60 * 60;
const allowedPhotoMimeTypes = ['image/jpeg', 'image/png', 'image/webp'] as const;
const maxPhotoUploadBytes = 8 * 1024 * 1024;
const maxPhotoSidePx = 1600;

@Injectable()
export class ProgressService {
  private readonly supabase: SupabaseClient<SupabaseDatabase>;
  private progressPhotosBucketReady = false;

  constructor(
    configService: ConfigService<AppConfig, true>,
    private readonly prismaService: PrismaService,
  ) {
    this.supabase = createClient<SupabaseDatabase>(
      configService.get('SUPABASE_URL', { infer: true }),
      configService.get('SUPABASE_SERVICE_KEY', { infer: true }),
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );
  }

  getStatus() {
    return { module: 'progress', status: 'ready' };
  }

  async listWeightLogs(
    clientId: string,
    query: ProgressListQuery,
    member: OrganizationMember | undefined,
  ) {
    await this.getAuthorizedClient(clientId, member);

    return this.prismaService.weightLog.findMany({
      where: {
        clientId,
        deletedAt: null,
        ...this.buildRecordedAtFilter(query),
      },
      orderBy: [{ recordedAt: 'desc' }, { createdAt: 'desc' }],
      take: this.parseLimit(query.limit),
    });
  }

  async createWeightLog(
    clientId: string,
    body: WeightLogDto,
    member: OrganizationMember | undefined,
  ) {
    await this.getAuthorizedClient(clientId, member);
    const data = this.parseWeightLog(body);

    return this.prismaService.weightLog.create({
      data: {
        clientId,
        recordedByType: ProgressRecordActor.coach,
        recordedByMemberId: this.requireMember(member).id,
        ...data,
      },
    });
  }

  async updateWeightLog(
    clientId: string,
    weightLogId: string,
    body: WeightLogDto,
    member: OrganizationMember | undefined,
  ) {
    await this.getAuthorizedClient(clientId, member);
    await this.getWeightLogForClient(clientId, weightLogId);
    const data = this.parseWeightLog(body, false);
    this.rejectEmptyPatch(data);

    return this.prismaService.weightLog.update({
      where: { id: weightLogId },
      data,
    });
  }

  async deleteWeightLog(
    clientId: string,
    weightLogId: string,
    member: OrganizationMember | undefined,
  ) {
    await this.getAuthorizedClient(clientId, member);
    await this.getWeightLogForClient(clientId, weightLogId);

    return this.prismaService.weightLog.update({
      where: { id: weightLogId },
      data: { deletedAt: new Date() },
    });
  }

  async listBodyMeasurements(
    clientId: string,
    query: ProgressListQuery,
    member: OrganizationMember | undefined,
  ) {
    await this.getAuthorizedClient(clientId, member);

    return this.prismaService.bodyMeasurementLog.findMany({
      where: {
        clientId,
        deletedAt: null,
        ...this.buildRecordedAtFilter(query),
      },
      orderBy: [{ recordedAt: 'desc' }, { createdAt: 'desc' }],
      take: this.parseLimit(query.limit),
    });
  }

  async createBodyMeasurement(
    clientId: string,
    body: BodyMeasurementDto,
    member: OrganizationMember | undefined,
  ) {
    await this.getAuthorizedClient(clientId, member);
    const data = this.parseBodyMeasurement(body, true);

    return this.prismaService.bodyMeasurementLog.create({
      data: {
        clientId,
        recordedByMemberId: this.requireMember(member).id,
        visibleToClient: false,
        ...data,
      },
    });
  }

  async updateBodyMeasurement(
    clientId: string,
    measurementId: string,
    body: BodyMeasurementDto,
    member: OrganizationMember | undefined,
  ) {
    await this.getAuthorizedClient(clientId, member);
    await this.getBodyMeasurementForClient(clientId, measurementId);
    const data = this.parseBodyMeasurement(body, false);
    this.rejectEmptyPatch(data);

    return this.prismaService.bodyMeasurementLog.update({
      where: { id: measurementId },
      data,
    });
  }

  async deleteBodyMeasurement(
    clientId: string,
    measurementId: string,
    member: OrganizationMember | undefined,
  ) {
    await this.getAuthorizedClient(clientId, member);
    await this.getBodyMeasurementForClient(clientId, measurementId);

    return this.prismaService.bodyMeasurementLog.update({
      where: { id: measurementId },
      data: { deletedAt: new Date() },
    });
  }

  async listPhotos(
    clientId: string,
    query: ProgressListQuery,
    member: OrganizationMember | undefined,
  ) {
    await this.getAuthorizedClient(clientId, member);
    const photos = await this.prismaService.progressPhoto.findMany({
      where: {
        clientId,
        deletedAt: null,
        ...this.buildRecordedAtFilter(query),
      },
      orderBy: [{ recordedAt: 'desc' }, { createdAt: 'desc' }],
      take: this.parseLimit(query.limit),
    });

    return this.attachSignedUrls(photos);
  }

  async createPhoto(
    clientId: string,
    body: ProgressPhotoDto,
    file: Express.Multer.File | undefined,
    member: OrganizationMember | undefined,
  ) {
    const client = await this.getAuthorizedClient(clientId, member);
    const activeMember = this.requireMember(member);
    const data = this.parsePhoto(body);
    const storagePath = this.buildPhotoStoragePath(client.organizationId, clientId);
    await this.uploadPhoto(storagePath, file);

    const photo = await this.prismaService.progressPhoto.create({
      data: {
        clientId,
        uploadedByType: ProgressRecordActor.coach,
        uploadedByMemberId: activeMember.id,
        storagePath,
        ...data,
      },
    });

    return this.attachSignedUrl(photo);
  }

  async deletePhoto(
    clientId: string,
    photoId: string,
    member: OrganizationMember | undefined,
  ) {
    const activeMember = this.requireMember(member);
    await this.getAuthorizedClient(clientId, activeMember);
    const photo = await this.getPhotoForClient(clientId, photoId);

    if (
      activeMember.role === OrganizationMemberRole.coach &&
      photo.uploadedByMemberId !== activeMember.id
    ) {
      throw new ForbiddenException('Coach can only delete own photos');
    }

    const deleted = await this.prismaService.progressPhoto.update({
      where: { id: photoId },
      data: { deletedAt: new Date() },
    });
    await this.tryRemovePhoto(photo.storagePath);

    return deleted;
  }

  async listClientWeightLogs(
    access: ClientPortalAccessWithClient,
    query: ProgressListQuery,
  ) {
    return this.prismaService.weightLog.findMany({
      where: {
        clientId: access.clientId,
        deletedAt: null,
        ...this.buildRecordedAtFilter(query),
      },
      orderBy: [{ recordedAt: 'desc' }, { createdAt: 'desc' }],
      take: this.parseLimit(query.limit),
    });
  }

  async createClientWeightLog(access: ClientPortalAccessWithClient, body: WeightLogDto) {
    if (!access.client.canRegisterWeight) {
      throw new ForbiddenException('Client cannot register weight');
    }
    const data = this.parseWeightLog(body);

    return this.prismaService.weightLog.create({
      data: {
        clientId: access.clientId,
        recordedByType: ProgressRecordActor.client,
        recordedByMemberId: null,
        ...data,
      },
    });
  }

  async updateClientWeightLog(
    access: ClientPortalAccessWithClient,
    weightLogId: string,
    body: WeightLogDto,
  ) {
    const weightLog = await this.getWeightLogForClient(access.clientId, weightLogId);
    if (weightLog.recordedByType !== ProgressRecordActor.client) {
      throw new ForbiddenException('Client can only update own weight logs');
    }
    const data = this.parseWeightLog(body, false);
    this.rejectEmptyPatch(data);

    return this.prismaService.weightLog.update({
      where: { id: weightLogId },
      data,
    });
  }

  async deleteClientWeightLog(access: ClientPortalAccessWithClient, weightLogId: string) {
    const weightLog = await this.getWeightLogForClient(access.clientId, weightLogId);
    if (weightLog.recordedByType !== ProgressRecordActor.client) {
      throw new ForbiddenException('Client can only delete own weight logs');
    }

    return this.prismaService.weightLog.update({
      where: { id: weightLogId },
      data: { deletedAt: new Date() },
    });
  }

  async listClientBodyMeasurements(
    access: ClientPortalAccessWithClient,
    query: ProgressListQuery,
  ) {
    return this.prismaService.bodyMeasurementLog.findMany({
      where: {
        clientId: access.clientId,
        deletedAt: null,
        visibleToClient: true,
        ...this.buildRecordedAtFilter(query),
      },
      orderBy: [{ recordedAt: 'desc' }, { createdAt: 'desc' }],
      take: this.parseLimit(query.limit),
    });
  }

  async listClientPhotos(
    access: ClientPortalAccessWithClient,
    query: ProgressListQuery,
  ) {
    const photos = await this.prismaService.progressPhoto.findMany({
      where: {
        clientId: access.clientId,
        deletedAt: null,
        ...this.buildRecordedAtFilter(query),
      },
      orderBy: [{ recordedAt: 'desc' }, { createdAt: 'desc' }],
      take: this.parseLimit(query.limit),
    });

    return this.attachSignedUrls(photos);
  }

  async createClientPhoto(
    access: ClientPortalAccessWithClient,
    body: ProgressPhotoDto,
    file: Express.Multer.File | undefined,
  ) {
    const data = this.parsePhoto(body);
    const storagePath = this.buildPhotoStoragePath(access.client.organizationId, access.clientId);
    await this.uploadPhoto(storagePath, file);

    const photo = await this.prismaService.progressPhoto.create({
      data: {
        clientId: access.clientId,
        uploadedByType: ProgressRecordActor.client,
        uploadedByMemberId: null,
        storagePath,
        ...data,
      },
    });

    return this.attachSignedUrl(photo);
  }

  async deleteClientPhoto(access: ClientPortalAccessWithClient, photoId: string) {
    const photo = await this.getPhotoForClient(access.clientId, photoId);
    if (photo.uploadedByType !== ProgressRecordActor.client) {
      throw new ForbiddenException('Client can only delete own photos');
    }

    const deleted = await this.prismaService.progressPhoto.update({
      where: { id: photoId },
      data: { deletedAt: new Date() },
    });
    await this.tryRemovePhoto(photo.storagePath);

    return deleted;
  }

  private async getAuthorizedClient(
    clientId: string,
    member: OrganizationMember | undefined,
  ) {
    const activeMember = this.requireMember(member);
    const client = await this.prismaService.client.findFirst({
      where: {
        id: clientId,
        organizationId: activeMember.organizationId,
      },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    if (
      activeMember.role === OrganizationMemberRole.coach &&
      client.assignedCoachMemberId !== activeMember.id
    ) {
      throw new ForbiddenException('Coach is not assigned to this client');
    }

    return client;
  }

  private async getWeightLogForClient(clientId: string, weightLogId: string) {
    const weightLog = await this.prismaService.weightLog.findFirst({
      where: {
        id: weightLogId,
        clientId,
        deletedAt: null,
      },
    });
    if (!weightLog) {
      throw new NotFoundException('Weight log not found');
    }

    return weightLog;
  }

  private async getBodyMeasurementForClient(clientId: string, measurementId: string) {
    const measurement = await this.prismaService.bodyMeasurementLog.findFirst({
      where: {
        id: measurementId,
        clientId,
        deletedAt: null,
      },
    });
    if (!measurement) {
      throw new NotFoundException('Body measurement not found');
    }

    return measurement;
  }

  private async getPhotoForClient(clientId: string, photoId: string) {
    const photo = await this.prismaService.progressPhoto.findFirst({
      where: {
        id: photoId,
        clientId,
        deletedAt: null,
      },
    });
    if (!photo) {
      throw new NotFoundException('Progress photo not found');
    }

    return photo;
  }

  private parseWeightLog(body: WeightLogDto): ParsedWeightLogCreate;
  private parseWeightLog(body: WeightLogDto, requireWeight: false): ParsedWeightLogUpdate;
  private parseWeightLog(
    body: WeightLogDto,
    requireWeight = true,
  ): ParsedWeightLogCreate | ParsedWeightLogUpdate {
    const weightKg = this.parseOptionalNumber(body.weightKg, 'weightKg', 0, 500);
    if (requireWeight && weightKg === undefined) {
      throw new BadRequestException('weightKg is required');
    }

    const commonFields = this.parseCommonFields(body);
    return weightKg !== undefined ? { weightKg, ...commonFields } : commonFields;
  }

  private parseBodyMeasurement(body: BodyMeasurementDto, requireMeasurement: boolean) {
    const measurements = Object.fromEntries(
      measurementFields
        .map((field) => [
          field,
          this.parseOptionalNumber(body[field], field, 0, 300, true),
        ])
        .filter((entry): entry is [MeasurementField, number | null] => entry[1] !== undefined),
    );

    if (requireMeasurement && !Object.values(measurements).some((value) => value !== null)) {
      throw new BadRequestException('At least one body measurement is required');
    }

    return {
      ...measurements,
      ...(body.visibleToClient !== undefined
        ? { visibleToClient: this.parseBoolean(body.visibleToClient, 'visibleToClient') }
        : {}),
      ...this.parseCommonFields(body),
    };
  }

  private parsePhoto(body: ProgressPhotoDto) {
    return {
      photoType: this.parsePhotoType(body.photoType),
      ...(body.recordedAt !== undefined ? { recordedAt: this.parseDate(body.recordedAt) } : {}),
    };
  }

  private parsePhotoType(value: string | undefined) {
    if (value === undefined || value === '') {
      return ProgressPhotoType.other;
    }
    if (!Object.values(ProgressPhotoType).includes(value as ProgressPhotoType)) {
      throw new BadRequestException('photoType must be front, side, back, or other');
    }

    return value as ProgressPhotoType;
  }

  private async uploadPhoto(storagePath: string, file: Express.Multer.File | undefined) {
    if (!file) {
      throw new BadRequestException('Photo file is required');
    }

    this.validatePhoto(file);
    await this.ensureProgressPhotosBucket();

    const optimizedPhoto = await sharp(file.buffer)
      .rotate()
      .resize({
        width: maxPhotoSidePx,
        height: maxPhotoSidePx,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 84 })
      .toBuffer();

    const { error } = await this.supabase.storage
      .from(progressPhotosBucketName)
      .upload(storagePath, optimizedPhoto, {
        cacheControl: '3600',
        contentType: 'image/webp',
        upsert: false,
      });

    if (error) {
      throw new BadRequestException(`Photo upload failed: ${error.message}`);
    }
  }

  private validatePhoto(file: Express.Multer.File) {
    if (!allowedPhotoMimeTypes.includes(file.mimetype as (typeof allowedPhotoMimeTypes)[number])) {
      throw new BadRequestException('Photo must be JPG, PNG, or WebP');
    }

    if (file.size > maxPhotoUploadBytes) {
      throw new BadRequestException('Photo must be 8 MB or smaller');
    }
  }

  private async ensureProgressPhotosBucket() {
    if (this.progressPhotosBucketReady) {
      return;
    }

    const { data } = await this.supabase.storage.getBucket(progressPhotosBucketName);

    if (!data) {
      const { error } = await this.supabase.storage.createBucket(progressPhotosBucketName, {
        allowedMimeTypes: ['image/webp'],
        fileSizeLimit: maxPhotoUploadBytes,
        public: false,
      });

      if (error) {
        throw new BadRequestException(`Could not create storage bucket: ${error.message}`);
      }
    } else if (data.public) {
      const { error } = await this.supabase.storage.updateBucket(progressPhotosBucketName, {
        allowedMimeTypes: ['image/webp'],
        fileSizeLimit: maxPhotoUploadBytes,
        public: false,
      });

      if (error) {
        throw new BadRequestException(`Could not update storage bucket: ${error.message}`);
      }
    }

    this.progressPhotosBucketReady = true;
  }

  private buildPhotoStoragePath(organizationId: string, clientId: string) {
    return `${progressPhotosBucketName}/${organizationId}/${clientId}/${randomUUID()}.webp`;
  }

  private async attachSignedUrls(photos: ProgressPhoto[]) {
    return Promise.all(photos.map((photo) => this.attachSignedUrl(photo)));
  }

  private async attachSignedUrl<T extends ProgressPhoto>(photo: T) {
    const { data, error } = await this.supabase.storage
      .from(progressPhotosBucketName)
      .createSignedUrl(photo.storagePath, signedUrlExpiresInSeconds);

    if (error || !data?.signedUrl) {
      throw new BadRequestException('Could not create signed photo URL');
    }

    return { ...photo, signedUrl: data.signedUrl };
  }

  private async tryRemovePhoto(storagePath: string) {
    try {
      await this.supabase.storage.from(progressPhotosBucketName).remove([storagePath]);
    } catch {
      return;
    }
  }

  private parseCommonFields(body: { note?: string | null; recordedAt?: string }) {
    const note = this.parseNote(body.note);

    return {
      ...(body.recordedAt !== undefined ? { recordedAt: this.parseDate(body.recordedAt) } : {}),
      ...(note !== undefined ? { note } : {}),
    };
  }

  private rejectEmptyPatch(data: Record<string, unknown>) {
    if (Object.keys(data).length === 0) {
      throw new BadRequestException('Patch body must include at least one editable field');
    }
  }

  private buildRecordedAtFilter(query: ProgressListQuery) {
    const recordedAt: DateRange = {};
    if (query.from !== undefined) {
      recordedAt.gte = this.parseDate(query.from);
    }
    if (query.to !== undefined) {
      recordedAt.lte = this.parseDate(query.to);
    }

    return Object.keys(recordedAt).length > 0 ? { recordedAt } : {};
  }

  private parseLimit(value: string | number | undefined) {
    if (value === undefined || value === '') {
      return 50;
    }
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new BadRequestException('limit must be a positive integer');
    }

    return Math.min(parsed, 200);
  }

  private parseOptionalNumber(
    value: number | string | null | undefined,
    field: string,
    min: number,
    max: number,
  ): number | undefined;
  private parseOptionalNumber(
    value: number | string | null | undefined,
    field: string,
    min: number,
    max: number,
    allowNull: true,
  ): number | null | undefined;
  private parseOptionalNumber(
    value: number | string | null | undefined,
    field: string,
    min: number,
    max: number,
    allowNull = false,
  ): number | null | undefined {
    if (value === undefined) {
      return undefined;
    }
    if (value === null && allowNull) {
      return null;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= min || parsed > max) {
      throw new BadRequestException(`${field} must be greater than ${min} and less than or equal to ${max}`);
    }

    return parsed;
  }

  private parseBoolean(value: boolean | string, field: string) {
    if (typeof value === 'boolean') {
      return value;
    }
    if (value === 'true') {
      return true;
    }
    if (value === 'false') {
      return false;
    }

    throw new BadRequestException(`${field} must be boolean`);
  }

  private parseDate(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('recordedAt/from/to must be valid dates');
    }

    return date;
  }

  private parseNote(value: string | null | undefined) {
    if (value === undefined) {
      return undefined;
    }
    if (value === null) {
      return null;
    }
    const note = value.trim();
    if (note.length > 500) {
      throw new BadRequestException('note must be at most 500 characters');
    }

    return note.length > 0 ? note : null;
  }

  private requireMember(member: OrganizationMember | undefined) {
    if (!member) {
      throw new ForbiddenException('Organization membership is required');
    }

    return member;
  }
}
