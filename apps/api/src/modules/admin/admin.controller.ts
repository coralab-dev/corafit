import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { AuthenticatedRequest } from '../../common/auth/authenticated-request';
import { PlatformAdminGuard } from '../../common/auth/platform-admin.guard';
import { ExerciseMediaService } from '../exercises/exercise-media.service';
import { ExercisesService } from '../exercises/exercises.service';
import type {
  CreateExerciseDto,
  ListExercisesQuery,
  UpdateExerciseDto,
} from '../exercises/dto/exercise.dto';
import {
  AdminService,
  type AdminOrganization,
  type ListAdminOrganizationsQuery,
} from './admin.service';

@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly exerciseMediaService: ExerciseMediaService,
    private readonly exercisesService: ExercisesService,
  ) {}

  @Get('status')
  getStatus() {
    return this.adminService.getStatus();
  }

  @UseGuards(PlatformAdminGuard)
  @Get('organizations')
  listOrganizations(
    @Query() query: ListAdminOrganizationsQuery,
  ): Promise<AdminOrganization[]> {
    return this.adminService.listOrganizations(query);
  }

  @UseGuards(PlatformAdminGuard)
  @Get('organizations/:organizationId')
  getOrganization(
    @Param('organizationId') organizationId: string,
  ): Promise<AdminOrganization> {
    return this.adminService.getOrganization(organizationId);
  }

  @UseGuards(PlatformAdminGuard)
  @Get('exercises')
  listGlobalExercises(@Query() query: ListExercisesQuery) {
    return this.exercisesService.listGlobal(query);
  }

  @UseGuards(PlatformAdminGuard)
  @Post('exercises')
  createGlobalExercise(
    @Body() body: CreateExerciseDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.exercisesService.createGlobal(body, request.user?.id);
  }

  @UseGuards(PlatformAdminGuard)
  @Patch('exercises/:exerciseId')
  updateGlobalExercise(
    @Param('exerciseId') exerciseId: string,
    @Body() body: UpdateExerciseDto,
  ) {
    return this.exercisesService.updateGlobal(exerciseId, body);
  }

  @UseGuards(PlatformAdminGuard)
  @UseInterceptors(FileInterceptor('image', { limits: { fileSize: 2 * 1024 * 1024 } }))
  @Post('exercises/:exerciseId/media')
  uploadGlobalExerciseMedia(
    @Param('exerciseId') exerciseId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.exerciseMediaService.uploadGlobalExerciseImage(
      exerciseId,
      file,
      request.user,
    );
  }

  @UseGuards(PlatformAdminGuard)
  @Delete('exercises/:exerciseId/media')
  removeGlobalExerciseMedia(
    @Param('exerciseId') exerciseId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.exerciseMediaService.removeGlobalExerciseMedia(
      exerciseId,
      request.user,
    );
  }

  @UseGuards(PlatformAdminGuard)
  @Delete('exercises/:exerciseId')
  deleteGlobalExercise(@Param('exerciseId') exerciseId: string) {
    return this.exercisesService.deleteGlobal(exerciseId);
  }
}
