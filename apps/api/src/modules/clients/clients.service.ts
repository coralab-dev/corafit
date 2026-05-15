import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'node:crypto';
import {
  ClientAccessStatus,
  ClientOperationalStatus,
  ClientType,
  type OrganizationMember,
} from 'db';
import type { AppConfig } from '../../config/env.schema';
import { PrismaService } from '../../common/prisma/prisma.service';
import type {
  CreateClientDto,
  ListClientsQuery,
  UpdateClientDto,
  UpdateClientStatusDto,
} from './dto/client.dto';

type ClientAccessTokenResult = {
  access: {
    clientId: string;
    id: string;
    status: ClientAccessStatus;
  };
  link: string;
  token: string;
};

@Injectable()
export class ClientsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  getStatus() {
    return { module: 'clients', status: 'ready' };
  }

  async list(query: ListClientsQuery, member: OrganizationMember | undefined) {
    const organizationId = this.getOrganizationId(member);
    const page = this.parsePositiveInt(query.page, 1);
    const limit = Math.min(this.parsePositiveInt(query.limit, 20), 100);
    const status = this.parseOptionalStatus(query.status);
    const search = query.search?.trim();

    const where = {
      organizationId,
      ...(status
        ? { operationalStatus: status }
        : { operationalStatus: { not: ClientOperationalStatus.archived } }),
      ...(search
        ? {
            name: {
              contains: search,
              mode: 'insensitive' as const,
            },
          }
        : {}),
    };

    const [items, total] = await this.prismaService.$transaction([
      this.prismaService.client.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prismaService.client.count({ where }),
    ]);

    return { items, page, limit, total };
  }

  async create(body: CreateClientDto, member: OrganizationMember | undefined) {
    if (!member) {
      throw new ForbiddenException('Organization membership is required');
    }
    const organizationId = this.getOrganizationId(member);
    const data = this.parseClientData(body, true);

    return this.prismaService.client.create({
      data: {
        age: data.age,
        canRegisterWeight: data.canRegisterWeight,
        clientType: data.clientType as ClientType,
        generalNotes: data.generalNotes,
        heightCm: data.heightCm as number,
        initialWeightKg: data.initialWeightKg as number,
        injuriesNotes: data.injuriesNotes,
        mainGoal: data.mainGoal as string,
        name: data.name as string,
        phone: data.phone,
        sex: data.sex,
        trainingLevel: data.trainingLevel,
        organizationId,
        assignedCoachMemberId: member.id,
      },
    });
  }

  async getById(clientId: string, member: OrganizationMember | undefined) {
    return this.getClientForOrganization(clientId, this.getOrganizationId(member));
  }

  async update(
    clientId: string,
    body: UpdateClientDto,
    member: OrganizationMember | undefined,
  ) {
    const organizationId = this.getOrganizationId(member);
    await this.getClientForOrganization(clientId, organizationId);
    const data = this.parseClientData(body, false);

    return this.prismaService.client.update({
      where: { id: clientId },
      data,
    });
  }

  async updateStatus(
    clientId: string,
    body: UpdateClientStatusDto,
    member: OrganizationMember | undefined,
  ) {
    const organizationId = this.getOrganizationId(member);
    await this.getClientForOrganization(clientId, organizationId);
    const operationalStatus = this.parseStatus(body.status);

    return this.prismaService.client.update({
      where: { id: clientId },
      data: { operationalStatus },
    });
  }

  async getNotes(clientId: string, member: OrganizationMember | undefined) {
    const organizationId = this.getOrganizationId(member);
    await this.getClientForOrganization(clientId, organizationId);

    return this.prismaService.followUpNote.findMany({
      where: {
        clientId,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createAccess(
    clientId: string,
    member: OrganizationMember | undefined,
  ): Promise<ClientAccessTokenResult> {
    const organizationId = this.getOrganizationId(member);
    await this.getClientForOrganization(clientId, organizationId);
    const existingAccess = await this.prismaService.clientAccess.findUnique({
      where: { clientId },
    });

    if (existingAccess?.tokenHash && existingAccess.status !== ClientAccessStatus.disabled) {
      throw new ConflictException('ACCESS_ALREADY_EXISTS');
    }

    const token = this.generateToken();
    const tokenHash = this.hashToken(token);
    const access = existingAccess
      ? await this.prismaService.clientAccess.update({
          where: { clientId },
          data: {
            tokenHash,
            status: ClientAccessStatus.active,
            failedAttempts: 0,
            lockedUntil: null,
          },
        })
      : await this.prismaService.clientAccess.create({
          data: {
            clientId,
            tokenHash,
            status: ClientAccessStatus.active,
          },
        });

    return this.formatAccessTokenResult(access, token);
  }

  async getAccess(clientId: string, member: OrganizationMember | undefined) {
    const organizationId = this.getOrganizationId(member);
    await this.getClientForOrganization(clientId, organizationId);
    const access = await this.prismaService.clientAccess.findUnique({
      where: { clientId },
    });

    if (!access) {
      return null;
    }

    return {
      clientId: access.clientId,
      id: access.id,
      lastAccessAt: access.lastAccessAt,
      lockedUntil: access.lockedUntil,
      status: access.status,
    };
  }

  async regenerateAccess(
    clientId: string,
    member: OrganizationMember | undefined,
  ): Promise<ClientAccessTokenResult> {
    const organizationId = this.getOrganizationId(member);
    await this.getClientForOrganization(clientId, organizationId);
    const token = this.generateToken();
    const tokenHash = this.hashToken(token);
    const access = await this.prismaService.clientAccess.upsert({
      where: { clientId },
      create: {
        clientId,
        tokenHash,
        status: ClientAccessStatus.active,
      },
      update: {
        tokenHash,
        status: ClientAccessStatus.active,
        failedAttempts: 0,
        lockedUntil: null,
      },
    });

    return this.formatAccessTokenResult(access, token);
  }

  async disableAccess(clientId: string, member: OrganizationMember | undefined) {
    const organizationId = this.getOrganizationId(member);
    await this.getClientForOrganization(clientId, organizationId);
    const access = await this.prismaService.clientAccess.findUnique({
      where: { clientId },
    });

    if (!access) {
      throw new NotFoundException('Client access was not found');
    }

    return this.prismaService.clientAccess.update({
      where: { clientId },
      data: {
        tokenHash: null,
        status: ClientAccessStatus.disabled,
      },
    });
  }

  findAccessByPlainToken(token: string): Promise<unknown> {
    return this.prismaService.clientAccess.findUnique({
      where: { tokenHash: this.hashToken(token) },
      include: { client: true },
    });
  }

  private async getClientForOrganization(clientId: string, organizationId: string) {
    const client = await this.prismaService.client.findFirst({
      where: { id: clientId, organizationId },
    });

    if (!client) {
      throw new NotFoundException('Client was not found');
    }

    return client;
  }

  private formatAccessTokenResult(
    access: { clientId: string; id: string; status: ClientAccessStatus },
    token: string,
  ): ClientAccessTokenResult {
    return {
      access: {
        clientId: access.clientId,
        id: access.id,
        status: access.status,
      },
      link: `${this.configService.get('WEB_APP_URL', { infer: true })}/c/${token}`,
      token,
    };
  }

  private generateToken() {
    return randomBytes(32).toString('base64url');
  }

  private getOrganizationId(member: OrganizationMember | undefined) {
    if (!member) {
      throw new ForbiddenException('Organization membership is required');
    }

    return member.organizationId;
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private parseClientData(
    body: Partial<CreateClientDto>,
    requireFields: boolean,
  ) {
    const name = this.parseString(body.name, 'name', requireFields);
    const clientType = this.parseClientType(body.clientType, requireFields);
    const mainGoal = this.parseString(body.mainGoal, 'mainGoal', requireFields);
    const heightCm = this.parseNumber(body.heightCm, 'heightCm', requireFields);
    const initialWeightKg = this.parseNumber(
      body.initialWeightKg,
      'initialWeightKg',
      requireFields,
    );

    return {
      ...(name !== undefined ? { name } : {}),
      ...(body.phone !== undefined ? { phone: this.parseOptionalString(body.phone, 'phone') } : {}),
      ...(body.age !== undefined ? { age: this.parseOptionalInt(body.age, 'age') } : {}),
      ...(body.sex !== undefined ? { sex: this.parseOptionalString(body.sex, 'sex') } : {}),
      ...(clientType !== undefined ? { clientType } : {}),
      ...(mainGoal !== undefined ? { mainGoal } : {}),
      ...(heightCm !== undefined ? { heightCm } : {}),
      ...(initialWeightKg !== undefined ? { initialWeightKg } : {}),
      ...(body.trainingLevel !== undefined
        ? { trainingLevel: this.parseOptionalString(body.trainingLevel, 'trainingLevel') }
        : {}),
      ...(body.injuriesNotes !== undefined
        ? { injuriesNotes: this.parseOptionalString(body.injuriesNotes, 'injuriesNotes') }
        : {}),
      ...(body.generalNotes !== undefined
        ? { generalNotes: this.parseOptionalString(body.generalNotes, 'generalNotes') }
        : {}),
      ...(body.canRegisterWeight !== undefined
        ? { canRegisterWeight: this.parseBoolean(body.canRegisterWeight) }
        : {}),
    };
  }

  private parseBoolean(value: unknown) {
    if (typeof value !== 'boolean') {
      throw new BadRequestException('canRegisterWeight must be boolean');
    }

    return value;
  }

  private parseClientType(value: unknown, required: boolean) {
    if (value === undefined && !required) {
      return undefined;
    }

    if (
      value !== ClientType.presential &&
      value !== ClientType.online &&
      value !== ClientType.hybrid
    ) {
      throw new BadRequestException('clientType is invalid');
    }

    return value;
  }

  private parseNumber(value: unknown, field: string, required: boolean) {
    if (value === undefined && !required) {
      return undefined;
    }

    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
      throw new BadRequestException(`${field} must be a positive number`);
    }

    return value;
  }

  private parseOptionalInt(value: unknown, field: string) {
    if (value === null) {
      return null;
    }

    if (!Number.isInteger(value) || Number(value) <= 0) {
      throw new BadRequestException(`${field} must be a positive integer`);
    }

    return value as number;
  }

  private parseOptionalStatus(value: unknown) {
    if (value === undefined) {
      return undefined;
    }

    return this.parseStatus(value);
  }

  private parseOptionalString(value: unknown, field: string) {
    if (value === null) {
      return null;
    }

    if (typeof value !== 'string') {
      throw new BadRequestException(`${field} must be a string`);
    }

    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  private parsePositiveInt(value: string | undefined, defaultValue: number) {
    if (value === undefined) {
      return defaultValue;
    }

    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new BadRequestException('Pagination values must be positive integers');
    }

    return parsed;
  }

  private parseStatus(value: unknown) {
    if (
      value !== ClientOperationalStatus.active &&
      value !== ClientOperationalStatus.paused &&
      value !== ClientOperationalStatus.inactive &&
      value !== ClientOperationalStatus.archived
    ) {
      throw new BadRequestException('status is invalid');
    }

    return value;
  }

  private parseString(value: unknown, field: string, required: boolean) {
    if (value === undefined && !required) {
      return undefined;
    }

    if (typeof value !== 'string') {
      throw new BadRequestException(`${field} is required`);
    }

    const trimmed = value.trim();

    if (!trimmed) {
      throw new BadRequestException(`${field} is required`);
    }

    return trimmed;
  }
}
