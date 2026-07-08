import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ClientOperationalStatus,
  OrganizationStatus,
  type Organization,
  type OrganizationSubscription,
  type SubscriptionPlan,
  type User,
} from 'db';
import { PrismaService } from '../../common/prisma/prisma.service';

type OrganizationWithAdminRelations = Organization & {
  owner: Pick<User, 'email' | 'id' | 'name'>;
  subscription:
    | (Pick<OrganizationSubscription, 'status'> & {
        subscriptionPlan: Pick<
          SubscriptionPlan,
          'clientLimit' | 'code' | 'id' | 'name'
        >;
      })
    | null;
};
type AdminSubscriptionPlanRecord = Pick<
  SubscriptionPlan,
  | 'clientLimit'
  | 'code'
  | 'createdAt'
  | 'currency'
  | 'id'
  | 'isPublic'
  | 'memberLimit'
  | 'name'
  | 'priceMonthly'
  | 'status'
  | 'updatedAt'
>;

export type ListAdminOrganizationsQuery = {
  search?: string;
  status?: string;
};

export type AdminOrganization = {
  clientsUsed: number;
  createdAt: Date;
  id: string;
  name: string;
  owner: Pick<User, 'email' | 'id' | 'name'>;
  plan: Pick<SubscriptionPlan, 'clientLimit' | 'code' | 'id' | 'name'> | null;
  status: OrganizationStatus;
  subscription: Pick<OrganizationSubscription, 'status'> | null;
  type: Organization['type'];
};

export type AdminSubscriptionPlan = {
  betaPrice: number;
  clientLimit: number;
  code: string;
  createdAt: Date;
  currency: string;
  id: string;
  isPublic: boolean;
  memberLimit: number;
  name: string;
  postBetaPrice: null;
  sortOrder: null;
  status: SubscriptionPlan['status'];
  updatedAt: Date;
};

@Injectable()
export class AdminService {
  constructor(private readonly prismaService: PrismaService) {}

  getStatus() {
    return { module: 'admin', status: 'ready' };
  }

  async listOrganizations(
    query: ListAdminOrganizationsQuery = {},
  ): Promise<AdminOrganization[]> {
    const organizations = await this.prismaService.organization.findMany({
      where: this.buildOrganizationWhere(query),
      include: this.organizationInclude,
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(
      organizations.map((organization) => this.toAdminOrganization(organization)),
    );
  }

  async getOrganization(organizationId: string): Promise<AdminOrganization> {
    const organization = await this.prismaService.organization.findUnique({
      where: { id: organizationId },
      include: this.organizationInclude,
    });

    if (!organization) {
      throw new NotFoundException('Organization was not found');
    }

    return this.toAdminOrganization(organization);
  }

  async listSubscriptionPlans(): Promise<AdminSubscriptionPlan[]> {
    const plans = await this.prismaService.subscriptionPlan.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        status: true,
        isPublic: true,
        priceMonthly: true,
        currency: true,
        clientLimit: true,
        memberLimit: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return plans.map((plan) => this.toAdminSubscriptionPlan(plan));
  }

  private get organizationInclude() {
    return {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      subscription: {
        select: {
          status: true,
          subscriptionPlan: {
            select: {
              id: true,
              code: true,
              name: true,
              clientLimit: true,
            },
          },
        },
      },
    };
  }

  private buildOrganizationWhere(query: ListAdminOrganizationsQuery) {
    const where: {
      OR?: Array<
        | { name: { contains: string; mode: 'insensitive' } }
        | { owner: { email: { contains: string; mode: 'insensitive' } } }
      >;
      status?: OrganizationStatus;
    } = {};
    const search = query.search?.trim();

    if (this.isOrganizationStatus(query.status)) {
      where.status = query.status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { owner: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    return where;
  }

  private async toAdminOrganization(
    organization: OrganizationWithAdminRelations,
  ): Promise<AdminOrganization> {
    const clientsUsed = await this.prismaService.client.count({
      where: {
        organizationId: organization.id,
        operationalStatus: { not: ClientOperationalStatus.archived },
      },
    });

    return {
      id: organization.id,
      name: organization.name,
      type: organization.type,
      status: organization.status,
      createdAt: organization.createdAt,
      owner: organization.owner,
      subscription: organization.subscription
        ? {
            status: organization.subscription.status,
          }
        : null,
      plan: organization.subscription
        ? organization.subscription.subscriptionPlan
        : null,
      clientsUsed,
    };
  }

  private isOrganizationStatus(
    status: string | undefined,
  ): status is OrganizationStatus {
    return Object.values(OrganizationStatus).includes(status as OrganizationStatus);
  }

  private toAdminSubscriptionPlan(
    plan: AdminSubscriptionPlanRecord,
  ): AdminSubscriptionPlan {
    return {
      id: plan.id,
      code: plan.code,
      name: plan.name,
      status: plan.status,
      isPublic: plan.isPublic,
      betaPrice: plan.priceMonthly,
      postBetaPrice: null,
      currency: plan.currency,
      clientLimit: plan.clientLimit,
      memberLimit: plan.memberLimit,
      sortOrder: null,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    };
  }
}
