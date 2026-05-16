import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { ClientAccessStatus } from 'db';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { VerifyPinDto } from './dto/verify-pin.dto';

export type TokenStatusResult = {
  valid: boolean;
  requiresPin: boolean;
  clientName?: string;
  locked?: boolean;
  lockedUntil?: Date | null;
  remainingAttempts?: number;
};

export type VerifyPinResult = {
  success: boolean;
  remainingAttempts: number;
  locked: boolean;
  lockedUntil?: Date | null;
  sessionToken?: string;
};

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const RETRY_AFTER_SECONDS = LOCKOUT_MS / 1000;

@Injectable()
export class ClientPortalService {
  constructor(private readonly prismaService: PrismaService) {}

  getStatus() {
    return { module: 'client-portal', status: 'ready' };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private generateToken() {
    return randomBytes(32).toString('base64url');
  }

  async getTokenStatus(token: string): Promise<TokenStatusResult> {
    const tokenHash = this.hashToken(token);

    const access = await this.prismaService.clientAccess.findUnique({
      where: { tokenHash },
      include: { client: true },
    });

    if (!access) {
      return { valid: false, requiresPin: false };
    }

    if (access.status === ClientAccessStatus.disabled) {
      return { valid: false, requiresPin: false };
    }

    const now = new Date();
    const isLocked = access.lockedUntil && access.lockedUntil > now;

    return {
      valid: true,
      requiresPin: !isLocked,
      clientName: access.client?.name,
      locked: isLocked || undefined,
      lockedUntil: isLocked ? access.lockedUntil : undefined,
      remainingAttempts: isLocked ? 0 : Math.max(0, MAX_FAILED_ATTEMPTS - access.failedAttempts),
    };
  }

  async verifyPin(token: string, body: VerifyPinDto): Promise<VerifyPinResult> {
    const pin = this.parsePin(body.pin);
    const tokenHash = this.hashToken(token);

    const access = await this.prismaService.clientAccess.findUnique({
      where: { tokenHash },
      include: { client: true },
    });

    if (!access) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (access.status === ClientAccessStatus.disabled) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const now = new Date();
    if (access.lockedUntil && access.lockedUntil > now) {
      throw new HttpException({
        message: 'Too many failed PIN attempts',
        retryAfter: Math.ceil((access.lockedUntil.getTime() - now.getTime()) / 1000),
        lockedUntil: access.lockedUntil,
      }, HttpStatus.TOO_MANY_REQUESTS);
    }

    if (!access.pinHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const failedAttempts = access.lockedUntil && access.lockedUntil <= now
      ? 0
      : access.failedAttempts;

    if (failedAttempts !== access.failedAttempts || access.lockedUntil) {
      await this.prismaService.clientAccess.update({
        where: { id: access.id },
        data: { failedAttempts, lockedUntil: null, status: ClientAccessStatus.active },
      });
    }

    const isPinValid = await this.verifyPinHash(pin, access.pinHash);

    if (!isPinValid) {
      const updatedAccess = await this.prismaService.clientAccess.update({
        where: { id: access.id },
        data: {
          failedAttempts: { increment: 1 },
        },
      });
      const shouldLock = updatedAccess.failedAttempts >= MAX_FAILED_ATTEMPTS;
      const lockedUntil = shouldLock
        ? new Date(now.getTime() + LOCKOUT_MS)
        : null;

      if (shouldLock) {
        await this.prismaService.clientAccess.update({
          where: { id: access.id },
          data: {
            lockedUntil,
            status: ClientAccessStatus.temporarily_locked,
          },
        });
        throw new HttpException({
          message: 'Too many failed PIN attempts',
          retryAfter: RETRY_AFTER_SECONDS,
          lockedUntil,
        }, HttpStatus.TOO_MANY_REQUESTS);
      }

      return {
        success: false,
        remainingAttempts: Math.max(0, MAX_FAILED_ATTEMPTS - updatedAccess.failedAttempts),
        locked: shouldLock,
        lockedUntil: lockedUntil || undefined,
      };
    }

    await this.prismaService.clientAccess.update({
      where: { id: access.id },
      data: {
        failedAttempts: 0,
        lockedUntil: null,
        status: ClientAccessStatus.active,
        lastAccessAt: now,
      },
    });

    const sessionToken = this.generateToken();
    await this.prismaService.clientPortalSession.create({
      data: {
        accessId: access.id,
        sessionTokenHash: this.hashToken(sessionToken),
        expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
      },
    });

    return {
      success: true,
      remainingAttempts: MAX_FAILED_ATTEMPTS,
      locked: false,
      sessionToken,
    };
  }

  async logout(sessionToken: string | undefined): Promise<void> {
    if (!sessionToken) {
      return;
    }

    await this.prismaService.clientPortalSession.updateMany({
      where: {
        sessionTokenHash: this.hashToken(sessionToken),
        invalidated: false,
      },
      data: { invalidated: true },
    });
  }

  private parsePin(value: unknown) {
    if (typeof value !== 'string' || !/^\d{6}$/.test(value)) {
      throw new BadRequestException('PIN must be 6 digits');
    }

    return value;
  }

  private async verifyPinHash(pin: string, hash: string): Promise<boolean> {
    const { default: argon2 } = await import('argon2');
    try {
      return await argon2.verify(hash, pin);
    } catch {
      return false;
    }
  }
}
