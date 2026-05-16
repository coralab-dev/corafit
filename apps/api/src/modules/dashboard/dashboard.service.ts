import { ForbiddenException, Injectable } from '@nestjs/common';
import {
  ClientAccessStatus,
  TrainingPlanType,
  type OrganizationMember,
} from 'db';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prismaService: PrismaService) {}

  getStatus() {
    return { module: 'dashboard', status: 'ready' };
  }

  async getOnboardingStats(member: OrganizationMember | undefined) {
    if (!member) {
      throw new ForbiddenException('Organization membership is required');
    }

    const organizationId = member.organizationId;

    const [
      totalClients,
      totalPlans,
      clientsWithAccessCount,
      clientsWithPortalPreviewCount,
    ] =
      await this.prismaService.$transaction([
        this.prismaService.client.count({ where: { organizationId } }),
        this.prismaService.trainingPlan.count({
          where: {
            organizationId,
            planType: TrainingPlanType.template,
          },
        }),
        this.prismaService.clientAccess.count({
          where: {
            status: { not: ClientAccessStatus.disabled },
            client: { organizationId },
          },
        }),
        this.prismaService.clientAccess.count({
          where: {
            lastAccessAt: { not: null },
            client: { organizationId },
          },
        }),
      ]);

    const clientsWithPlan = await this.prismaService.client.count({
      where: {
        organizationId,
        assignedPlans: { some: {} },
      },
    });

    return {
      totalClients,
      totalPlans,
      clientsWithPlan,
      clientsWithoutPlan: totalClients - clientsWithPlan,
      clientsWithAccess: clientsWithAccessCount,
      checklist: {
        hasCreatedClient: totalClients > 0,
        hasCreatedOrSelectedPlan: totalPlans > 0,
        hasAssignedPlan: clientsWithPlan > 0,
        hasGeneratedAccess: clientsWithAccessCount > 0,
        hasPreviewedPortal: clientsWithPortalPreviewCount > 0,
      },
    };
  }
}
