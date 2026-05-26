import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  OrganizationMemberRole,
  OrganizationMemberStatus,
  OrganizationStatus,
  OrganizationType,
  SubscriptionPlanStatus,
  SubscriptionStatus,
  type Organization,
  type OrganizationMember,
  type OrganizationSubscription,
  type SubscriptionPlan,
  UserStatus,
  type User,
} from 'db';
import { SupabaseAuthService } from '../../common/auth/supabase-auth.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { RegisterProfileDto } from './dto/register-profile.dto';

export type RegisterProfileResult = {
  member: OrganizationMember;
  organization: Organization;
  subscription: OrganizationSubscription & {
    subscriptionPlan: SubscriptionPlan;
  };
  user: User;
};

export type AuthProfileResult = RegisterProfileResult;

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly supabaseAuthService: SupabaseAuthService,
  ) {}

  getStatus() {
    return { module: 'auth', status: 'ready' };
  }

  async getMe(authorizationHeader: string | undefined): Promise<AuthProfileResult> {
    const jwt = this.extractBearerToken(authorizationHeader);
    const supabaseUser = await this.supabaseAuthService.getUserFromJwt(jwt);
    const user = await this.prismaService.user.findUnique({
      where: { supabaseUserId: supabaseUser.id },
    });

    if (!user) {
      throw new NotFoundException({
        error: 'PROFILE_NOT_FOUND',
        message: 'Internal profile was not found',
      });
    }

    const member = await this.prismaService.organizationMember.findFirst({
      where: {
        userId: user.id,
        status: OrganizationMemberStatus.active,
      },
      include: {
        organization: {
          include: {
            subscription: {
              include: {
                subscriptionPlan: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const subscription = member?.organization.subscription;

    if (!member || !subscription) {
      throw new NotFoundException({
        error: 'PROFILE_NOT_FOUND',
        message: 'Internal profile was not found',
      });
    }

    const { organization, ...memberData } = member;

    return {
      user,
      organization: {
        id: organization.id,
        name: organization.name,
        type: organization.type,
        timezone: organization.timezone,
        status: organization.status,
        ownerUserId: organization.ownerUserId,
        onboardingCompletedAt: organization.onboardingCompletedAt,
        clientPortalPreviewSeenAt: organization.clientPortalPreviewSeenAt,
        createdAt: organization.createdAt,
        updatedAt: organization.updatedAt,
      },
      member: memberData,
      subscription,
    };
  }

  async registerProfile(
    body: RegisterProfileDto,
    authorizationHeader: string | undefined,
  ): Promise<RegisterProfileResult> {
    const name = this.normalizeName(body.name);
    const jwt = this.extractBearerToken(authorizationHeader);
    const supabaseUser = await this.supabaseAuthService.getUserFromJwt(jwt);

    if (!supabaseUser.email) {
      throw new BadRequestException('Supabase user email is required');
    }
    const email = supabaseUser.email;

    const existingUser = await this.prismaService.user.findUnique({
      where: { supabaseUserId: supabaseUser.id },
    });

    if (existingUser) {
      throw new ConflictException({
        error: 'PROFILE_EXISTS',
        message: 'User profile already exists',
      });
    }

    return this.prismaService.$transaction(async (transaction) => {
      const trialPlan = await transaction.subscriptionPlan.upsert({
        where: { code: 'trial' },
        create: {
          code: 'trial',
          name: 'Trial',
          description: 'Plan de prueba inicial para coaches nuevos',
          priceMonthly: 0,
          clientLimit: 5,
          memberLimit: 1,
          status: SubscriptionPlanStatus.active,
        },
        update: {
          status: SubscriptionPlanStatus.active,
        },
      });

      const user = await transaction.user.create({
        data: {
          supabaseUserId: supabaseUser.id,
          email,
          name,
          phone: this.normalizeOptionalText(body.phone),
          status: UserStatus.active,
        },
      });

      const organization = await transaction.organization.create({
        data: {
          name,
          type: OrganizationType.individual,
          timezone: 'America/Mexico_City',
          status: OrganizationStatus.active,
          ownerUserId: user.id,
        },
      });

      const member = await transaction.organizationMember.create({
        data: {
          organizationId: organization.id,
          userId: user.id,
          role: OrganizationMemberRole.owner,
          status: OrganizationMemberStatus.active,
        },
      });

      const startedAt = new Date();
      const renewsAt = new Date(startedAt);
      renewsAt.setDate(renewsAt.getDate() + 30);

      const subscription = await transaction.organizationSubscription.create({
        data: {
          organizationId: organization.id,
          subscriptionPlanId: trialPlan.id,
          status: SubscriptionStatus.trial,
          startedAt,
          renewsAt,
        },
        include: {
          subscriptionPlan: true,
        },
      });

      return { user, organization, member, subscription };
    });
  }

  private normalizeName(name: unknown) {
    if (typeof name !== 'string') {
      throw new BadRequestException('Name is required');
    }

    const trimmedName = name.trim();

    if (!trimmedName) {
      throw new BadRequestException('Name is required');
    }

    return trimmedName;
  }

  private normalizeOptionalText(value: unknown) {
    if (typeof value !== 'string') {
      return null;
    }

    const trimmedValue = value.trim();
    return trimmedValue || null;
  }

  private extractBearerToken(authorizationHeader: string | undefined): string {
    if (!authorizationHeader) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const [scheme, token] = authorizationHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Invalid authorization header');
    }

    return token;
  }
}
