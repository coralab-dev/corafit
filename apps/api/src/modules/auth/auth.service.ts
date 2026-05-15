import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import {
  OrganizationMemberRole,
  OrganizationMemberStatus,
  OrganizationStatus,
  OrganizationType,
  UserStatus,
  type User,
} from 'db';
import { SupabaseAuthService } from '../../common/auth/supabase-auth.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { RegisterProfileDto } from './dto/register-profile.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly supabaseAuthService: SupabaseAuthService,
  ) {}

  getStatus() {
    return { module: 'auth', status: 'ready' };
  }

  getMe(user: User | undefined) {
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      supabaseUserId: user.supabaseUserId,
      email: user.email,
      name: user.name,
      phone: user.phone,
      platformRole: user.platformRole,
      status: user.status,
    };
  }

  async registerProfile(
    body: RegisterProfileDto,
    authorizationHeader: string | undefined,
  ) {
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
      throw new ConflictException('User profile already exists');
    }

    return this.prismaService.$transaction(async (transaction) => {
      const user = await transaction.user.create({
        data: {
          supabaseUserId: supabaseUser.id,
          email,
          name,
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

      return { user, organization, member };
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
