import { Body, Controller, Get, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { Public } from '../../common/auth/public.decorator';
import type { AppConfig } from '../../config/env.schema';
import { ClientPortalAuthGuard } from './client-portal-auth.guard';
import type { ClientPortalRequest } from './client-portal-request';
import { ClientPortalService } from './client-portal.service';
import type { VerifyPinDto } from './dto/verify-pin.dto';

const SESSION_COOKIE_NAME = 'corafit_client_session';
const SESSION_COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

@Public()
@Controller('client-portal')
export class ClientPortalController {
  constructor(
    private readonly clientPortalService: ClientPortalService,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  @Get('status')
  getStatus() {
    return this.clientPortalService.getStatus();
  }

  @Get(':token')
  async getTokenStatus(@Param('token') token: string) {
    return this.clientPortalService.getTokenStatus(token);
  }

  @UseGuards(ClientPortalAuthGuard)
  @Get(':token/session')
  getSession(@Req() request: ClientPortalRequest) {
    return {
      authenticated: true,
      clientId: request.clientPortalAccess?.clientId,
      expiresAt: request.clientPortalSession?.expiresAt,
    };
  }

  @Post(':token/verify-pin')
  async verifyPin(
    @Param('token') token: string,
    @Body() body: VerifyPinDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.clientPortalService.verifyPin(token, body);

    if (result.success && result.sessionToken) {
      res.setHeader(
        'Set-Cookie',
        this.serializeSessionCookie(result.sessionToken, SESSION_COOKIE_MAX_AGE_SECONDS),
      );
    }

    return {
      success: result.success,
      remainingAttempts: result.remainingAttempts,
      locked: result.locked,
      lockedUntil: result.lockedUntil,
    };
  }

  @Post('logout')
  async logout(@Req() request: ClientPortalRequest, @Res({ passthrough: true }) res: Response) {
    await this.clientPortalService.logout(this.extractSessionToken(request.headers.cookie));
    res.setHeader('Set-Cookie', this.serializeSessionCookie('', 0));

    return { success: true };
  }

  private extractSessionToken(cookieHeader: string | undefined) {
    const sessionCookie = cookieHeader
      ?.split(';')
      .map((cookie) => cookie.trim())
      .find((cookie) => cookie.startsWith(`${SESSION_COOKIE_NAME}=`));
    const token = sessionCookie?.slice(SESSION_COOKIE_NAME.length + 1);

    return token ? decodeURIComponent(token) : undefined;
  }

  private serializeSessionCookie(value: string, maxAge: number) {
    const secureAttribute =
      this.configService.get('NODE_ENV', { infer: true }) === 'production'
        ? 'Secure; '
        : '';

    return (
      `${SESSION_COOKIE_NAME}=${encodeURIComponent(value)}; ` +
      `HttpOnly; ` +
      secureAttribute +
      `SameSite=Strict; ` +
      `Path=/; ` +
      `Max-Age=${maxAge}`
    );
  }
}
