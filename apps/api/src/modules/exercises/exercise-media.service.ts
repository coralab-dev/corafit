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
  ExerciseMediaType,
  type OrganizationMember,
  type User,
  UserPlatformRole,
} from 'db';
import type { AppConfig } from '../../config/env.schema';
import { PrismaService } from '../../common/prisma/prisma.service';

type SupabaseDatabase = {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

const bucketName = 'exercise-media';
const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'] as const;
const maxUploadBytes = 2 * 1024 * 1024;
const maxImageSidePx = 1200;

@Injectable()
export class ExerciseMediaService {
  private readonly supabase: SupabaseClient<SupabaseDatabase>;
  private bucketReady = false;

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

  async uploadCustomExerciseImage(
    exerciseId: string,
    file: Express.Multer.File | undefined,
    member: OrganizationMember | undefined,
  ) {
    if (!member) {
      throw new ForbiddenException('Organization membership is required');
    }

    const exercise = await this.prismaService.exercise.findFirst({
      where: { id: exerciseId },
    });

    if (!exercise || exercise.organizationId !== member.organizationId) {
      throw new NotFoundException('Exercise was not found or is not editable');
    }

    return this.replaceImage(exerciseId, file, exercise.mediaUrl);
  }

  async removeCustomExerciseMedia(
    exerciseId: string,
    member: OrganizationMember | undefined,
  ) {
    if (!member) {
      throw new ForbiddenException('Organization membership is required');
    }

    const exercise = await this.prismaService.exercise.findFirst({
      where: { id: exerciseId },
    });

    if (!exercise || exercise.organizationId !== member.organizationId) {
      throw new NotFoundException('Exercise was not found or is not editable');
    }

    return this.clearMedia(exerciseId, exercise.mediaUrl);
  }

  async uploadGlobalExerciseImage(
    exerciseId: string,
    file: Express.Multer.File | undefined,
    user: User | undefined,
  ) {
    this.assertPlatformAdmin(user);

    const exercise = await this.prismaService.exercise.findFirst({
      where: { id: exerciseId, organizationId: null },
    });

    if (!exercise) {
      throw new NotFoundException('Global exercise was not found');
    }

    return this.replaceImage(exerciseId, file, exercise.mediaUrl);
  }

  async removeGlobalExerciseMedia(exerciseId: string, user: User | undefined) {
    this.assertPlatformAdmin(user);

    const exercise = await this.prismaService.exercise.findFirst({
      where: { id: exerciseId, organizationId: null },
    });

    if (!exercise) {
      throw new NotFoundException('Global exercise was not found');
    }

    return this.clearMedia(exerciseId, exercise.mediaUrl);
  }

  private async replaceImage(
    exerciseId: string,
    file: Express.Multer.File | undefined,
    previousUrl: string | null,
  ) {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }

    this.validateImage(file);
    await this.ensureBucket();

    const optimizedImage = await sharp(file.buffer)
      .rotate()
      .resize({
        width: maxImageSidePx,
        height: maxImageSidePx,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 82 })
      .toBuffer();

    const path = `exercises/${exerciseId}/${randomUUID()}.webp`;
    const { error } = await this.supabase.storage
      .from(bucketName)
      .upload(path, optimizedImage, {
        cacheControl: '31536000',
        contentType: 'image/webp',
        upsert: false,
      });

    if (error) {
      throw new BadRequestException(`Image upload failed: ${error.message}`);
    }

    const { data } = this.supabase.storage.from(bucketName).getPublicUrl(path);

    const updatedExercise = await this.prismaService.exercise.update({
      where: { id: exerciseId },
      data: {
        mediaType: ExerciseMediaType.image,
        mediaUrl: data.publicUrl,
      },
    });

    await this.removePublicUrl(previousUrl);
    return updatedExercise;
  }

  private async clearMedia(exerciseId: string, previousUrl: string | null) {
    const updatedExercise = await this.prismaService.exercise.update({
      where: { id: exerciseId },
      data: {
        mediaType: null,
        mediaUrl: null,
      },
    });

    await this.removePublicUrl(previousUrl);
    return updatedExercise;
  }

  private validateImage(file: Express.Multer.File) {
    if (!allowedMimeTypes.includes(file.mimetype as (typeof allowedMimeTypes)[number])) {
      throw new BadRequestException('Image must be JPG, PNG, or WebP');
    }

    if (file.size > maxUploadBytes) {
      throw new BadRequestException('Image must be 2 MB or smaller');
    }
  }

  private async ensureBucket() {
    if (this.bucketReady) {
      return;
    }

    const { data } = await this.supabase.storage.getBucket(bucketName);

    if (!data) {
      const { error } = await this.supabase.storage.createBucket(bucketName, {
        allowedMimeTypes: ['image/webp'],
        fileSizeLimit: maxUploadBytes,
        public: true,
      });

      if (error) {
        throw new BadRequestException(`Could not create storage bucket: ${error.message}`);
      }
    } else if (!data.public) {
      const { error } = await this.supabase.storage.updateBucket(bucketName, {
        allowedMimeTypes: ['image/webp'],
        fileSizeLimit: maxUploadBytes,
        public: true,
      });

      if (error) {
        throw new BadRequestException(`Could not update storage bucket: ${error.message}`);
      }
    }

    this.bucketReady = true;
  }

  private async removePublicUrl(publicUrl: string | null) {
    const path = this.getStoragePath(publicUrl);

    if (!path) {
      return;
    }

    await this.supabase.storage.from(bucketName).remove([path]);
  }

  private getStoragePath(publicUrl: string | null) {
    if (!publicUrl) {
      return null;
    }

    const marker = `/storage/v1/object/public/${bucketName}/`;
    const [, path] = publicUrl.split(marker);
    return path ? decodeURIComponent(path) : null;
  }

  private assertPlatformAdmin(user: User | undefined) {
    if (user?.platformRole !== UserPlatformRole.admin_saas) {
      throw new ForbiddenException('Platform admin role is required');
    }
  }
}
