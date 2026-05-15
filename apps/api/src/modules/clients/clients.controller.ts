import {
  Body,
  Controller,
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
  CreateClientDto,
  ListClientsQuery,
  UpdateClientDto,
  UpdateClientStatusDto,
} from './dto/client.dto';

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
}
