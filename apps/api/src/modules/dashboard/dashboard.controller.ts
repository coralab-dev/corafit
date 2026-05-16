import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { OrganizationMemberRole } from 'db';
import type { AuthenticatedRequest } from '../../common/auth/authenticated-request';
import { OrganizationGuard } from '../../common/auth/organization.guard';
import { RoleGuard } from '../../common/auth/role.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('status')
  getStatus() {
    return this.dashboardService.getStatus();
  }

  @UseGuards(OrganizationGuard, RoleGuard)
  @Roles(OrganizationMemberRole.owner, OrganizationMemberRole.coach)
  @Get('onboarding')
  getOnboarding(@Req() request: AuthenticatedRequest) {
    return this.dashboardService.getOnboardingStats(
      request.organizationMember,
    );
  }
}
