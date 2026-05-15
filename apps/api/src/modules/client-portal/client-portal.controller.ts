import { Body, Controller, Get, Param, Post, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { Public } from '../../common/auth/public.decorator';
import type { AppConfig } from '../../config/env.schema';
import { ClientPortalService } from './client-portal.service';
import type { VerifyPinDto } from './dto/verify-pin.dto';

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

  @Post(':token/verify-pin')
  async verifyPin(
    @Param('token') token: string,
    @Body() body: VerifyPinDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.clientPortalService.verifyPin(token, body);

    if (result.success && result.sessionToken) {
      const secureAttribute =
        this.configService.get('NODE_ENV', { infer: true }) === 'production'
          ? 'Secure; '
          : '';

      res.setHeader(
        'Set-Cookie',
        `corafit_client_session=${result.sessionToken}; ` +
          `HttpOnly; ` +
          secureAttribute +
          `SameSite=Strict; ` +
          `Path=/; ` +
          `Max-Age=${7 * 24 * 60 * 60}`,
      );
    }

    return {
      success: result.success,
      remainingAttempts: result.remainingAttempts,
      locked: result.locked,
      lockedUntil: result.lockedUntil,
    };
  }
}
