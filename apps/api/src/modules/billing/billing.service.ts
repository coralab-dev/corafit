import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ClientOperationalStatus,
  SubscriptionPlanStatus,
  type OrganizationMember,
  type SubscriptionPlan,
} from 'db';
import { PrismaService } from '../../common/prisma/prisma.service';

type ClientUsageWarningLevel = 'ok' | 'near_limit' | 'at_limit' | 'over_limit';
type BillingPlanRecord = Pick<
  SubscriptionPlan,
  | 'clientLimit'
  | 'code'
  | 'currency'
  | 'description'
  | 'id'
  | 'memberLimit'
  | 'name'
  | 'priceMonthly'
>;

@Injectable()
export class BillingService {
  constructor(private readonly prismaService: PrismaService) {}

  getStatus() {
    return { module: 'billing', status: 'ready' };
  }

  async listPublicPlans() {
    const plans = await this.prismaService.subscriptionPlan.findMany({
      where: {
        status: SubscriptionPlanStatus.active,
        isPublic: true,
      },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        priceMonthly: true,
        currency: true,
        clientLimit: true,
        memberLimit: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return plans.map((plan) => this.toBillingPlan(plan));
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

    const usedClients = await this.prismaService.client.count({
      where: {
        organizationId: organizationMember.organizationId,
        operationalStatus: { not: ClientOperationalStatus.archived },
      },
    });
    const clientLimit = subscription.subscriptionPlan.clientLimit;
    const clientUsage = {
      used: usedClients,
      limit: clientLimit,
      remaining: Math.max(clientLimit - usedClients, 0),
      isAtLimit: usedClients === clientLimit,
      isOverLimit: usedClients > clientLimit,
      warningLevel: this.getClientUsageWarningLevel(usedClients, clientLimit),
    };

    return {
      id: subscription.id,
      organizationId: subscription.organizationId,
      status: subscription.status,
      startedAt: subscription.startedAt,
      renewsAt: subscription.renewsAt,
      cancelledAt: subscription.cancelledAt,
      usedClients,
      clientUsage,
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

  private getClientUsageWarningLevel(
    usedClients: number,
    clientLimit: number,
  ): ClientUsageWarningLevel {
    if (usedClients > clientLimit) {
      return 'over_limit';
    }

    if (usedClients === clientLimit) {
      return 'at_limit';
    }

    if (usedClients >= clientLimit * 0.8) {
      return 'near_limit';
    }

    return 'ok';
  }

  private toBillingPlan(plan: BillingPlanRecord) {
    return {
      id: plan.id,
      code: plan.code,
      name: plan.name,
      description: plan.description,
      betaPrice: plan.priceMonthly,
      postBetaPrice: null,
      currency: plan.currency,
      clientLimit: plan.clientLimit,
      memberLimit: plan.memberLimit,
    };
  }
}
