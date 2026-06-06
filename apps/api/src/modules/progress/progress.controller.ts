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
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { OrganizationMemberRole } from 'db';
import type { AuthenticatedRequest } from '../../common/auth/authenticated-request';
import { OrganizationGuard } from '../../common/auth/organization.guard';
import { RoleGuard } from '../../common/auth/role.guard';
import { Roles } from '../../common/auth/roles.decorator';
import {
  ProgressService,
  type BodyMeasurementDto,
  type FollowUpNoteDto,
  type ProgressListQuery,
  type ProgressPhotoDto,
  type WeightLogDto,
} from './progress.service';

@Controller('progress')
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Get('status')
  getStatus() {
    return this.progressService.getStatus();
  }

  @UseGuards(OrganizationGuard, RoleGuard)
  @Roles(OrganizationMemberRole.owner, OrganizationMemberRole.coach)
  @Get('clients/:clientId/weight-logs')
  listWeightLogs(
    @Param('clientId') clientId: string,
    @Query() query: ProgressListQuery,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.progressService.listWeightLogs(clientId, query, request.organizationMember);
  }

  @UseGuards(OrganizationGuard, RoleGuard)
  @Roles(OrganizationMemberRole.owner, OrganizationMemberRole.coach)
  @Post('clients/:clientId/weight-logs')
  createWeightLog(
    @Param('clientId') clientId: string,
    @Body() body: WeightLogDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.progressService.createWeightLog(clientId, body, request.organizationMember);
  }

  @UseGuards(OrganizationGuard, RoleGuard)
  @Roles(OrganizationMemberRole.owner, OrganizationMemberRole.coach)
  @Patch('clients/:clientId/weight-logs/:weightLogId')
  updateWeightLog(
    @Param('clientId') clientId: string,
    @Param('weightLogId') weightLogId: string,
    @Body() body: WeightLogDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.progressService.updateWeightLog(
      clientId,
      weightLogId,
      body,
      request.organizationMember,
    );
  }

  @UseGuards(OrganizationGuard, RoleGuard)
  @Roles(OrganizationMemberRole.owner, OrganizationMemberRole.coach)
  @Delete('clients/:clientId/weight-logs/:weightLogId')
  deleteWeightLog(
    @Param('clientId') clientId: string,
    @Param('weightLogId') weightLogId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.progressService.deleteWeightLog(
      clientId,
      weightLogId,
      request.organizationMember,
    );
  }

  @UseGuards(OrganizationGuard, RoleGuard)
  @Roles(OrganizationMemberRole.owner, OrganizationMemberRole.coach)
  @Get('clients/:clientId/body-measurements')
  listBodyMeasurements(
    @Param('clientId') clientId: string,
    @Query() query: ProgressListQuery,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.progressService.listBodyMeasurements(clientId, query, request.organizationMember);
  }

  @UseGuards(OrganizationGuard, RoleGuard)
  @Roles(OrganizationMemberRole.owner, OrganizationMemberRole.coach)
  @Post('clients/:clientId/body-measurements')
  createBodyMeasurement(
    @Param('clientId') clientId: string,
    @Body() body: BodyMeasurementDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.progressService.createBodyMeasurement(clientId, body, request.organizationMember);
  }

  @UseGuards(OrganizationGuard, RoleGuard)
  @Roles(OrganizationMemberRole.owner, OrganizationMemberRole.coach)
  @Patch('clients/:clientId/body-measurements/:measurementId')
  updateBodyMeasurement(
    @Param('clientId') clientId: string,
    @Param('measurementId') measurementId: string,
    @Body() body: BodyMeasurementDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.progressService.updateBodyMeasurement(
      clientId,
      measurementId,
      body,
      request.organizationMember,
    );
  }

  @UseGuards(OrganizationGuard, RoleGuard)
  @Roles(OrganizationMemberRole.owner, OrganizationMemberRole.coach)
  @Delete('clients/:clientId/body-measurements/:measurementId')
  deleteBodyMeasurement(
    @Param('clientId') clientId: string,
    @Param('measurementId') measurementId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.progressService.deleteBodyMeasurement(
      clientId,
      measurementId,
      request.organizationMember,
    );
  }

  @UseGuards(OrganizationGuard, RoleGuard)
  @Roles(OrganizationMemberRole.owner, OrganizationMemberRole.coach)
  @Get('clients/:clientId/photos')
  listPhotos(
    @Param('clientId') clientId: string,
    @Query() query: ProgressListQuery,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.progressService.listPhotos(clientId, query, request.organizationMember);
  }

  @UseGuards(OrganizationGuard, RoleGuard)
  @Roles(OrganizationMemberRole.owner, OrganizationMemberRole.coach)
  @Post('clients/:clientId/photos')
  @UseInterceptors(FileInterceptor('photo', { limits: { fileSize: 8 * 1024 * 1024 } }))
  createPhoto(
    @Param('clientId') clientId: string,
    @Body() body: ProgressPhotoDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.progressService.createPhoto(clientId, body, file, request.organizationMember);
  }

  @UseGuards(OrganizationGuard, RoleGuard)
  @Roles(OrganizationMemberRole.owner, OrganizationMemberRole.coach)
  @Delete('clients/:clientId/photos/:photoId')
  deletePhoto(
    @Param('clientId') clientId: string,
    @Param('photoId') photoId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.progressService.deletePhoto(clientId, photoId, request.organizationMember);
  }

  @UseGuards(OrganizationGuard, RoleGuard)
  @Roles(OrganizationMemberRole.owner, OrganizationMemberRole.coach)
  @Get('clients/:clientId/notes')
  listNotes(
    @Param('clientId') clientId: string,
    @Query() query: Pick<ProgressListQuery, 'limit'>,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.progressService.listNotes(clientId, query, request.organizationMember);
  }

  @UseGuards(OrganizationGuard, RoleGuard)
  @Roles(OrganizationMemberRole.owner, OrganizationMemberRole.coach)
  @Post('clients/:clientId/notes')
  createNote(
    @Param('clientId') clientId: string,
    @Body() body: FollowUpNoteDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.progressService.createNote(clientId, body, request.organizationMember);
  }

  @UseGuards(OrganizationGuard, RoleGuard)
  @Roles(OrganizationMemberRole.owner, OrganizationMemberRole.coach)
  @Patch('clients/:clientId/notes/:noteId')
  updateNote(
    @Param('clientId') clientId: string,
    @Param('noteId') noteId: string,
    @Body() body: FollowUpNoteDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.progressService.updateNote(clientId, noteId, body, request.organizationMember);
  }

  @UseGuards(OrganizationGuard, RoleGuard)
  @Roles(OrganizationMemberRole.owner, OrganizationMemberRole.coach)
  @Delete('clients/:clientId/notes/:noteId')
  deleteNote(
    @Param('clientId') clientId: string,
    @Param('noteId') noteId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.progressService.deleteNote(clientId, noteId, request.organizationMember);
  }
}
