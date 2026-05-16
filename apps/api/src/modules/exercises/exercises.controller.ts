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
  UseGuards,
} from '@nestjs/common';
import { OrganizationMemberRole } from 'db';
import type { AuthenticatedRequest } from '../../common/auth/authenticated-request';
import { OrganizationGuard } from '../../common/auth/organization.guard';
import { RoleGuard } from '../../common/auth/role.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { ExercisesService } from './exercises.service';
import type {
  CreateExerciseDto,
  ListExercisesQuery,
  UpdateExerciseDto,
} from './dto/exercise.dto';

@Controller('exercises')
export class ExercisesController {
  constructor(private readonly exercisesService: ExercisesService) {}

  @UseGuards(OrganizationGuard, RoleGuard)
  @Roles(OrganizationMemberRole.owner, OrganizationMemberRole.coach)
  @Get()
  list(@Query() query: ListExercisesQuery, @Req() request: AuthenticatedRequest) {
    return this.exercisesService.list(query, request.organizationMember);
  }

  @UseGuards(OrganizationGuard, RoleGuard)
  @Roles(OrganizationMemberRole.owner, OrganizationMemberRole.coach)
  @Get(':exerciseId')
  getById(
    @Param('exerciseId') exerciseId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.exercisesService.getById(exerciseId, request.organizationMember);
  }

  @UseGuards(OrganizationGuard, RoleGuard)
  @Roles(OrganizationMemberRole.owner, OrganizationMemberRole.coach)
  @Post('custom')
  createCustom(
    @Body() body: CreateExerciseDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.exercisesService.createCustom(body, request.organizationMember);
  }

  @UseGuards(OrganizationGuard, RoleGuard)
  @Roles(OrganizationMemberRole.owner, OrganizationMemberRole.coach)
  @Patch(':exerciseId')
  update(
    @Param('exerciseId') exerciseId: string,
    @Body() body: UpdateExerciseDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.exercisesService.update(
      exerciseId,
      body,
      request.organizationMember,
    );
  }

  @UseGuards(OrganizationGuard, RoleGuard)
  @Roles(OrganizationMemberRole.owner, OrganizationMemberRole.coach)
  @Delete(':exerciseId')
  delete(
    @Param('exerciseId') exerciseId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.exercisesService.delete(exerciseId, request.organizationMember);
  }
}