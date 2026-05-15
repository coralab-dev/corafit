import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { OrganizationMember } from 'db';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class BillingService {
  constructor(private readonly prismaService: PrismaService) {}

  getStatus() {
    return { module: 'billing', status: 'ready' };
  }

  async getCurrent(organizationMember: OrganizationMember | undefined) {
    if (!organizationMember) {
      throw new ForbiddenException('Organization membership is required');
    }

    const subscription =
      await this.prismaService.organizationSubscription.findUnique({
        where: { organizationId: organizationMember.organizationId },
        include: {
          subscriptionPlan: true,
        },
      });

    if (!subscription) {
      throw new NotFoundException('Organization subscription was not found');
    }

    return {
      id: subscription.id,
      organizationId: subscription.organizationId,
      status: subscription.status,
      startedAt: subscription.startedAt,
      renewsAt: subscription.renewsAt,
      cancelledAt: subscription.cancelledAt,
      plan: {
        id: subscription.subscriptionPlan.id,
        code: subscription.subscriptionPlan.code,
        name: subscription.subscriptionPlan.name,
        clientLimit: subscription.subscriptionPlan.clientLimit,
        memberLimit: subscription.subscriptionPlan.memberLimit,
        priceMonthly: subscription.subscriptionPlan.priceMonthly,
        currency: subscription.subscriptionPlan.currency,
      },
    };
  }
}
