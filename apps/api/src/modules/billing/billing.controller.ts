import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { AuthenticatedRequest } from '../../common/auth/authenticated-request';
import { OrganizationGuard } from '../../common/auth/organization.guard';
import { BillingService } from './billing.service';

@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('status')
  getStatus() {
    return this.billingService.getStatus();
  }

  @UseGuards(OrganizationGuard)
  @Get('current')
  getCurrent(@Req() request: AuthenticatedRequest) {
    return this.billingService.getCurrent(request.organizationMember);
  }
}
