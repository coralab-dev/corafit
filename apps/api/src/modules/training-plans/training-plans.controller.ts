import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Param,
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
import { TrainingPlansService } from './training-plans.service';
import type {
  CopyDayDto,
  CreateSessionExerciseAlternativeDto,
  CreateSessionExerciseDto,
  CreatePlanDto,
  DuplicatePlanDto,
  ListPlansQuery,
  QuickCreatePlanDto,
  ReorderSessionExercisesDto,
  UpdatePlanDto,
  UpdateSessionDto,
  UpdateSessionExerciseAlternativeDto,
  UpdateSessionExerciseDto,
} from './dto/training-plan.dto';

@Controller('training-plans')
export class TrainingPlansController {
  constructor(private readonly trainingPlansService: TrainingPlansService) {}

  @UseGuards(OrganizationGuard, RoleGuard)
  @Roles(OrganizationMemberRole.owner, OrganizationMemberRole.coach)
  @Get()
  list(@Query() query: ListPlansQuery, @Req() request: AuthenticatedRequest) {
    return this.trainingPlansService.list(query, request.organizationMember);
  }

  @UseGuards(OrganizationGuard, RoleGuard)
  @Roles(OrganizationMemberRole.owner, OrganizationMemberRole.coach)
  @Get(':planId')
  getById(
    @Param('planId') planId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.trainingPlansService.getById(planId, request.organizationMember);
  }

  @UseGuards(OrganizationGuard, RoleGuard)
  @Roles(OrganizationMemberRole.owner, OrganizationMemberRole.coach)
  @Post('quick-create')
  quickCreate(
    @Body() body: QuickCreatePlanDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.trainingPlansService.quickCreate(body, request.organizationMember);
  }

  @UseGuards(OrganizationGuard, RoleGuard)
  @Roles(OrganizationMemberRole.owner, OrganizationMemberRole.coach)
  @Post()
  create(
    @Body() body: CreatePlanDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.trainingPlansService.createManual(body, request.organizationMember);
  }

  @UseGuards(OrganizationGuard, RoleGuard)
  @Roles(OrganizationMemberRole.owner, OrganizationMemberRole.coach)
  @Patch(':planId')
  update(
    @Param('planId') planId: string,
    @Body() body: UpdatePlanDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.trainingPlansService.updatePlan(planId, body, request.organizationMember);
  }

  @UseGuards(OrganizationGuard, RoleGuard)
  @Roles(OrganizationMemberRole.owner, OrganizationMemberRole.coach)
  @Post(':planId/duplicate')
  duplicate(
    @Param('planId') planId: string,
    @Body() body: DuplicatePlanDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.trainingPlansService.duplicate(planId, body, request.organizationMember);
  }

  @UseGuards(OrganizationGuard, RoleGuard)
  @Roles(OrganizationMemberRole.owner, OrganizationMemberRole.coach)
  @Post(':planId/weeks/:weekId/duplicate')
  duplicateWeek(
    @Param('planId') planId: string,
    @Param('weekId') weekId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.trainingPlansService.duplicateWeek(planId, weekId, request.organizationMember);
  }
}

@Controller('training-sessions')
export class TrainingSessionsController {
  constructor(private readonly trainingPlansService: TrainingPlansService) {}

  @UseGuards(OrganizationGuard, RoleGuard)
  @Roles(OrganizationMemberRole.owner, OrganizationMemberRole.coach)
  @Patch(':sessionId')
  updateSession(
    @Param('sessionId') sessionId: string,
    @Body() body: UpdateSessionDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.trainingPlansService.updateSession(sessionId, body, request.organizationMember);
  }

  @UseGuards(OrganizationGuard, RoleGuard)
  @Roles(OrganizationMemberRole.owner, OrganizationMemberRole.coach)
  @Post(':sessionId/exercises')
  createSessionExercise(
    @Param('sessionId') sessionId: string,
    @Body() body: CreateSessionExerciseDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.trainingPlansService.createSessionExercise(sessionId, body, request.organizationMember);
  }
}

@Controller('session-exercises')
export class SessionExercisesController {
  constructor(private readonly trainingPlansService: TrainingPlansService) {}

  @UseGuards(OrganizationGuard, RoleGuard)
  @Roles(OrganizationMemberRole.owner, OrganizationMemberRole.coach)
  @Patch(':sessionExerciseId')
  updateSessionExercise(
    @Param('sessionExerciseId') sessionExerciseId: string,
    @Body() body: UpdateSessionExerciseDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.trainingPlansService.updateSessionExercise(sessionExerciseId, body, request.organizationMember);
  }

  @UseGuards(OrganizationGuard, RoleGuard)
  @Roles(OrganizationMemberRole.owner, OrganizationMemberRole.coach)
  @Delete(':sessionExerciseId')
  deleteSessionExercise(
    @Param('sessionExerciseId') sessionExerciseId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.trainingPlansService.deleteSessionExercise(sessionExerciseId, request.organizationMember);
  }

  @UseGuards(OrganizationGuard, RoleGuard)
  @Roles(OrganizationMemberRole.owner, OrganizationMemberRole.coach)
  @Post(':sessionExerciseId/duplicate')
  duplicateSessionExercise(
    @Param('sessionExerciseId') sessionExerciseId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.trainingPlansService.duplicateSessionExercise(sessionExerciseId, request.organizationMember);
  }

  @UseGuards(OrganizationGuard, RoleGuard)
  @Roles(OrganizationMemberRole.owner, OrganizationMemberRole.coach)
  @Post('reorder')
  reorderSessionExercises(
    @Body() body: ReorderSessionExercisesDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.trainingPlansService.reorderSessionExercises(body, request.organizationMember);
  }

  @UseGuards(OrganizationGuard, RoleGuard)
  @Roles(OrganizationMemberRole.owner, OrganizationMemberRole.coach)
  @Post(':sessionExerciseId/alternative')
  createAlternative(
    @Param('sessionExerciseId') sessionExerciseId: string,
    @Body() body: CreateSessionExerciseAlternativeDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.trainingPlansService.createAlternative(sessionExerciseId, body, request.organizationMember);
  }
}

@Controller('session-exercise-alternatives')
export class SessionExerciseAlternativesController {
  constructor(private readonly trainingPlansService: TrainingPlansService) {}

  @UseGuards(OrganizationGuard, RoleGuard)
  @Roles(OrganizationMemberRole.owner, OrganizationMemberRole.coach)
  @Patch(':alternativeId')
  updateAlternative(
    @Param('alternativeId') alternativeId: string,
    @Body() body: UpdateSessionExerciseAlternativeDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.trainingPlansService.updateAlternative(alternativeId, body, request.organizationMember);
  }

  @UseGuards(OrganizationGuard, RoleGuard)
  @Roles(OrganizationMemberRole.owner, OrganizationMemberRole.coach)
  @Delete(':alternativeId')
  deleteAlternative(
    @Param('alternativeId') alternativeId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.trainingPlansService.deleteAlternative(alternativeId, request.organizationMember);
  }
}

@Controller('training-plan-days')
export class TrainingPlanDaysController {
  constructor(private readonly trainingPlansService: TrainingPlansService) {}

  @UseGuards(OrganizationGuard, RoleGuard)
  @Roles(OrganizationMemberRole.owner, OrganizationMemberRole.coach)
  @Post(':dayId/copy')
  copyDay(
    @Param('dayId') dayId: string,
    @Body() body: CopyDayDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.trainingPlansService.copyDay(dayId, body, request.organizationMember);
  }
}
