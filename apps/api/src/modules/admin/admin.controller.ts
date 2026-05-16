import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { AuthenticatedRequest } from '../../common/auth/authenticated-request';
import { PlatformAdminGuard } from '../../common/auth/platform-admin.guard';
import { ExerciseMediaService } from '../exercises/exercise-media.service';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly exerciseMediaService: ExerciseMediaService,
  ) {}

  @Get('status')
  getStatus() {
    return this.adminService.getStatus();
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
}
