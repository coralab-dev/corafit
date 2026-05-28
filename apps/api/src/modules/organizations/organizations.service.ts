import { BadRequestException, Injectable } from '@nestjs/common';
import type { OrganizationMember } from 'db';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { UpdateOrganizationDto } from './dto/update-organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prismaService: PrismaService) {}

  getStatus() {
    return { module: 'organizations', status: 'ready' };
  }

  async updateCurrent(
    organizationMember: OrganizationMember,
    dto: UpdateOrganizationDto,
  ) {
    const name = this.normalizeName(dto.name);

    const organization = await this.prismaService.organization.update({
      where: { id: organizationMember.organizationId },
      data: { name },
    });

    return organization;
  }

  private normalizeName(name: unknown) {
    if (typeof name !== 'string') {
      throw new BadRequestException('Name is required');
    }

    const trimmedName = name.trim();

    if (trimmedName.length < 2 || trimmedName.length > 100) {
      throw new BadRequestException(
        'Name must be between 2 and 100 characters',
      );
    }

    return trimmedName;
  }
}