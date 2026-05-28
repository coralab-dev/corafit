import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { OrganizationMemberRole } from 'db';
import type { AuthenticatedRequest } from '../../common/auth/authenticated-request';
import { OrganizationGuard } from '../../common/auth/organization.guard';
import { RoleGuard } from '../../common/auth/role.guard';
import { Roles } from '../../common/auth/roles.decorator';
import type { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationsService } from './organizations.service';

@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get('status')
  getStatus() {
    return this.organizationsService.getStatus();
  }

  @UseGuards(OrganizationGuard, RoleGuard)
  @Roles(OrganizationMemberRole.owner)
  @Patch('current')
  updateCurrent(
    @Body() body: UpdateOrganizationDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.organizationsService.updateCurrent(
      request.organizationMember!,
      body,
    );
  }
}