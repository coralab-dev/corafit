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
import { ClientsService } from './clients.service';
import type {
  AssignPlanDto,
  CreateClientDto,
  ListClientsQuery,
  UpdateClientDto,
  UpdateClientStatusDto,
  UpdateCurrentPlanAssignmentDto,
} from './dto/client.dto';
import type {
  CopyDayDto,
  CreateDayDto,
  CreateSessionDto,
  CreateSessionExerciseAlternativeDto,
  CreateSessionExerciseDto,
  CreateWeekDto,
  ReorderSessionExercisesDto,
  UpdateSessionDto,
  UpdateSessionExerciseAlternativeDto,
  UpdateSessionExerciseDto,
} from '../training-plans/dto/training-plan.dto';

@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get('status')
  getStatus() {
    return this.clientsService.getStatus();
  }

  @UseGuards(OrganizationGuard, RoleGuard)
  @Roles(OrganizationMemberRole.owner, OrganizationMemberRole.coach)
  @Get()
  list(@Query() query: ListClientsQuery, @Req() request: AuthenticatedRequest) {
    return this.clientsService.list(query, request.organizationMember);
  }

  @UseGuards(OrganizationGuard, RoleGuard)
  @Roles(OrganizationMemberRole.owner, OrganizationMemberRole.coach)
  @Post()
  create(@Body() body: CreateClientDto, @Req() request: AuthenticatedRequest) {
    return this.clientsService.create(body, request.organizationMember);
  }

  @UseGuards(OrganizationGuard, RoleGuard)
  @Roles(OrganizationMemberRole.owner, OrganizationMemberRole.coach)
  @Get(':clientId')
  getById(
    @Param('clientId') clientId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.clientsService.getById(clientId, request.organizationMember);
  }

  @UseGuards(OrganizationGuard, RoleGuard)
  @Roles(OrganizationMemberRole.owner, OrganizationMemberRole.coach)
  @Patch(':clientId')
  update(
    @Param('clientId') clientId: string,
    @Body() body: UpdateClientDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.clientsService.update(clientId, body, request.organizationMember);
  }

  @UseGuards(OrganizationGuard, RoleGuard)
  @Roles(OrganizationMemberRole.owner, OrganizationMemberRole.coach)
  @Patch(':clientId/status')
  updateStatus(
    @Param('clientId') clientId: string,
    @Body() body: UpdateClientStatusDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.clientsService.updateStatus(
      clientId,
      body,
      request.organizationMember,
    );
  }

  @UseGuards(OrganizationGuard, RoleGuard)
  @Roles(OrganizationMemberRole.owner, OrganizationMemberRole.coach)
  @Get(':clientId/notes')
  getNotes(
    @Param('clientId') clientId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.clientsService.getNotes(clientId, request.organizationMember);
  }

  @UseGuards(OrganizationGuard, RoleGuard)
  @Roles(OrganizationMemberRole.owner, OrganizationMemberRole.coach)
  @Post(':clientId/access')
  createAccess(
    @Param('clientId') clientId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.clientsService.createAccess(clientId, request.organizationMember);
  }

  @UseGuards(OrganizationGuard, RoleGuard)
  @Roles(OrganizationMemberRole.owner, OrganizationMemberRole.coach)
  @Get(':clientId/access')
  getAccess(
    @Param('clientId') clientId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.clientsService.getAccess(clientId, request.organizationMember);
  }

  @UseGuards(OrganizationGuard, RoleGuard)
  @Roles(OrganizationMemberRole.owner, OrganizationMemberRole.coach)
  @Post(':clientId/access/regenerate-pin')
  regenerateAccess(
    @Param('clientId') clientId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.clientsService.regenerateAccess(
      clientId,
      request.organizationMember,
    );
  }

  @UseGuards(OrganizationGuard, RoleGuard)
  @Roles(OrganizationMemberRole.owner, OrganizationMemberRole.coach)
  @Patch(':clientId/access/disable')
  disableAccess(
    @Param('clientId') clientId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.clientsService.disableAccess(clientId, request.organizationMember);
  }

  @UseGuards(OrganizationGuard, RoleGuard)
  @Roles(OrganizationMemberRole.owner, OrganizationMemberRole.coach)
  @Post(':clientId/assign-plan')
  assignPlan(
    @Param('clientId') clientId: string,
    @Body() body: AssignPlanDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.clientsService.assignPlan(clientId, body, request.organizationMember);
  }

  @UseGuards(OrganizationGuard, RoleGuard)
  @Roles(OrganizationMemberRole.owner, OrganizationMemberRole.coach)
  @Get(':clientId/plan-assignment/current')
  getCurrentPlanAssignment(
    @Param('clientId') clientId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.clientsService.getCurrentPlanAssignment(
      clientId,
      request.organizationMember,
    );
  }

  @UseGuards(OrganizationGuard, RoleGuard)
  @Roles(OrganizationMemberRole.owner, OrganizationMemberRole.coach)
  @Patch(':clientId/plan-assignment/current')
  updateCurrentPlanAssignment(
    @Param('clientId') clientId: string,
    @Body() body: UpdateCurrentPlanAssignmentDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.clientsService.updateCurrentPlanAssignment(
      clientId,
      body,
      request.organizationMember,
    );
  }

  @UseGuards(OrganizationGuard, RoleGuard)
  @Roles(OrganizationMemberRole.owner, OrganizationMemberRole.coach)
  @Post(':clientId/plan-assignment/current/end')
  endCurrentPlanAssignment(
    @Param('clientId') clientId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.clientsService.endCurrentPlanAssignment(
      clientId,
      request.organizationMember,
    );
  }

  @UseGuards(OrganizationGuard, RoleGuard)
  @Roles(OrganizationMemberRole.owner, OrganizationMemberRole.coach)
  @Post(':clientId/plan-assignment/current/weeks')
  createCurrentAssignmentWeek(
    @Param('clientId') clientId: string,
    @Body() body: CreateWeekDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.clientsService.createCurrentAssignmentWeek(
      clientId,
      body,
      request.organizationMember,
    );
  }

  @UseGuards(OrganizationGuard, RoleGuard)
  @Roles(OrganizationMemberRole.owner, OrganizationMemberRole.coach)
  @Post(':clientId/plan-assignment/current/weeks/:weekId/duplicate')
  duplicateCurrentAssignmentWeek(
    @Param('clientId') clientId: string,
    @Param('weekId') weekId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.clientsService.duplicateCurrentAssignmentWeek(
      clientId,
      weekId,
      request.organizationMember,
    );
  }

  @UseGuards(OrganizationGuard, RoleGuard)
  @Roles(OrganizationMemberRole.owner, OrganizationMemberRole.coach)
  @Delete(':clientId/plan-assignment/current/weeks/:weekId')
  deleteCurrentAssignmentWeek(
    @Param('clientId') clientId: string,
    @Param('weekId') weekId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.clientsService.deleteCurrentAssignmentWeek(
      clientId,
      weekId,
      request.organizationMember,
    );
  }

  @UseGuards(OrganizationGuard, RoleGuard)
  @Roles(OrganizationMemberRole.owner, OrganizationMemberRole.coach)
  @Post(':clientId/plan-assignment/current/weeks/:weekId/days')
  createCurrentAssignmentDay(
    @Param('clientId') clientId: string,
    @Param('weekId') weekId: string,
    @Body() body: CreateDayDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.clientsService.createCurrentAssignmentDay(
      clientId,
      weekId,
      body,
      request.organizationMember,
    );
  }

  @UseGuards(OrganizationGuard, RoleGuard)
  @Roles(OrganizationMemberRole.owner, OrganizationMemberRole.coach)
  @Post(':clientId/plan-assignment/current/days/:dayId/copy')
  copyCurrentAssignmentDay(
    @Param('clientId') clientId: string,
    @Param('dayId') dayId: string,
    @Body() body: CopyDayDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.clientsService.copyCurrentAssignmentDay(
      clientId,
      dayId,
      body,
      request.organizationMember,
    );
  }

  @UseGuards(OrganizationGuard, RoleGuard)
  @Roles(OrganizationMemberRole.owner, OrganizationMemberRole.coach)
  @Delete(':clientId/plan-assignment/current/days/:dayId')
  deleteCurrentAssignmentDay(
    @Param('clientId') clientId: string,
    @Param('dayId') dayId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.clientsService.deleteCurrentAssignmentDay(
      clientId,
      dayId,
      request.organizationMember,
    );
  }

  @UseGuards(OrganizationGuard, RoleGuard)
  @Roles(OrganizationMemberRole.owner, OrganizationMemberRole.coach)
  @Post(':clientId/plan-assignment/current/days/:dayId/sessions')
  createCurrentAssignmentSession(
    @Param('clientId') clientId: string,
    @Param('dayId') dayId: string,
    @Body() body: CreateSessionDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.clientsService.createCurrentAssignmentSession(
      clientId,
      dayId,
      body,
      request.organizationMember,
    );
  }

  @UseGuards(OrganizationGuard, RoleGuard)
  @Roles(OrganizationMemberRole.owner, OrganizationMemberRole.coach)
  @Patch(':clientId/plan-assignment/current/sessions/:sessionId')
  updateCurrentAssignmentSession(
    @Param('clientId') clientId: string,
    @Param('sessionId') sessionId: string,
    @Body() body: UpdateSessionDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.clientsService.updateCurrentAssignmentSession(
      clientId,
      sessionId,
      body,
      request.organizationMember,
    );
  }

  @UseGuards(OrganizationGuard, RoleGuard)
  @Roles(OrganizationMemberRole.owner, OrganizationMemberRole.coach)
  @Delete(':clientId/plan-assignment/current/sessions/:sessionId')
  deleteCurrentAssignmentSession(
    @Param('clientId') clientId: string,
    @Param('sessionId') sessionId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.clientsService.deleteCurrentAssignmentSession(
      clientId,
      sessionId,
      request.organizationMember,
    );
  }

  @UseGuards(OrganizationGuard, RoleGuard)
  @Roles(OrganizationMemberRole.owner, OrganizationMemberRole.coach)
  @Post(':clientId/plan-assignment/current/sessions/:sessionId/exercises')
  createCurrentAssignmentSessionExercise(
    @Param('clientId') clientId: string,
    @Param('sessionId') sessionId: string,
    @Body() body: CreateSessionExerciseDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.clientsService.createCurrentAssignmentSessionExercise(
      clientId,
      sessionId,
      body,
      request.organizationMember,
    );
  }

  @UseGuards(OrganizationGuard, RoleGuard)
  @Roles(OrganizationMemberRole.owner, OrganizationMemberRole.coach)
  @Post(':clientId/plan-assignment/current/exercises/reorder')
  reorderCurrentAssignmentSessionExercises(
    @Param('clientId') clientId: string,
    @Body() body: ReorderSessionExercisesDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.clientsService.reorderCurrentAssignmentSessionExercises(
      clientId,
      body,
      request.organizationMember,
    );
  }

  @UseGuards(OrganizationGuard, RoleGuard)
  @Roles(OrganizationMemberRole.owner, OrganizationMemberRole.coach)
  @Patch(':clientId/plan-assignment/current/exercises/:sessionExerciseId')
  updateCurrentAssignmentSessionExercise(
    @Param('clientId') clientId: string,
    @Param('sessionExerciseId') sessionExerciseId: string,
    @Body() body: UpdateSessionExerciseDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.clientsService.updateCurrentAssignmentSessionExercise(
      clientId,
      sessionExerciseId,
      body,
      request.organizationMember,
    );
  }

  @UseGuards(OrganizationGuard, RoleGuard)
  @Roles(OrganizationMemberRole.owner, OrganizationMemberRole.coach)
  @Delete(':clientId/plan-assignment/current/exercises/:sessionExerciseId')
  deleteCurrentAssignmentSessionExercise(
    @Param('clientId') clientId: string,
    @Param('sessionExerciseId') sessionExerciseId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.clientsService.deleteCurrentAssignmentSessionExercise(
      clientId,
      sessionExerciseId,
      request.organizationMember,
    );
  }

  @UseGuards(OrganizationGuard, RoleGuard)
  @Roles(OrganizationMemberRole.owner, OrganizationMemberRole.coach)
  @Post(':clientId/plan-assignment/current/exercises/:sessionExerciseId/duplicate')
  duplicateCurrentAssignmentSessionExercise(
    @Param('clientId') clientId: string,
    @Param('sessionExerciseId') sessionExerciseId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.clientsService.duplicateCurrentAssignmentSessionExercise(
      clientId,
      sessionExerciseId,
      request.organizationMember,
    );
  }

  @UseGuards(OrganizationGuard, RoleGuard)
  @Roles(OrganizationMemberRole.owner, OrganizationMemberRole.coach)
  @Post(':clientId/plan-assignment/current/exercises/:sessionExerciseId/alternative')
  createCurrentAssignmentAlternative(
    @Param('clientId') clientId: string,
    @Param('sessionExerciseId') sessionExerciseId: string,
    @Body() body: CreateSessionExerciseAlternativeDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.clientsService.createCurrentAssignmentAlternative(
      clientId,
      sessionExerciseId,
      body,
      request.organizationMember,
    );
  }

  @UseGuards(OrganizationGuard, RoleGuard)
  @Roles(OrganizationMemberRole.owner, OrganizationMemberRole.coach)
  @Patch(':clientId/plan-assignment/current/alternatives/:alternativeId')
  updateCurrentAssignmentAlternative(
    @Param('clientId') clientId: string,
    @Param('alternativeId') alternativeId: string,
    @Body() body: UpdateSessionExerciseAlternativeDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.clientsService.updateCurrentAssignmentAlternative(
      clientId,
      alternativeId,
      body,
      request.organizationMember,
    );
  }

  @UseGuards(OrganizationGuard, RoleGuard)
  @Roles(OrganizationMemberRole.owner, OrganizationMemberRole.coach)
  @Delete(':clientId/plan-assignment/current/alternatives/:alternativeId')
  deleteCurrentAssignmentAlternative(
    @Param('clientId') clientId: string,
    @Param('alternativeId') alternativeId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.clientsService.deleteCurrentAssignmentAlternative(
      clientId,
      alternativeId,
      request.organizationMember,
    );
  }
}
