import { Body, Controller, Get, Param, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { Public } from '../../common/auth/public.decorator';
import type { AppConfig } from '../../config/env.schema';
import { ClientPortalAuthGuard } from './client-portal-auth.guard';
import type { ClientPortalRequest } from './client-portal-request';
import { ClientPortalService } from './client-portal.service';
import type { VerifyPinDto } from './dto/verify-pin.dto';
import type { ClientPortalCalendarQuery } from './client-portal.service';
import {
  ClientSessionLogsService,
  type OpenClientSessionLogDto,
  type UseClientSessionAlternativeDto,
} from './client-session-logs.service';

const SESSION_COOKIE_NAME = 'corafit_client_session';
const SESSION_COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

@Public()
@Controller('client-portal')
export class ClientPortalController {
  constructor(
    private readonly clientPortalService: ClientPortalService,
    private readonly clientSessionLogsService: ClientSessionLogsService,
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

  @UseGuards(ClientPortalAuthGuard)
  @Get(':token/calendar')
  getCalendar(
    @Query() query: ClientPortalCalendarQuery,
    @Req() request: ClientPortalRequest,
  ) {
    return this.clientPortalService.getCalendar(request.clientPortalAccess!, query);
  }

  @UseGuards(ClientPortalAuthGuard)
  @Post(':token/session-logs/open')
  openSessionLog(
    @Body() body: OpenClientSessionLogDto,
    @Req() request: ClientPortalRequest,
  ): Promise<unknown> {
    return this.clientSessionLogsService.openSession(request.clientPortalAccess!, body);
  }

  @UseGuards(ClientPortalAuthGuard)
  @Get(':token/session-logs/:id')
  getSessionLog(
    @Param('id') id: string,
    @Req() request: ClientPortalRequest,
  ): Promise<unknown> {
    return this.clientSessionLogsService.getSessionLog(request.clientPortalAccess!, id);
  }

  @UseGuards(ClientPortalAuthGuard)
  @Post(':token/session-logs/:id/exercises/:sessionExerciseId/complete')
  completeSessionExercise(
    @Param('id') id: string,
    @Param('sessionExerciseId') sessionExerciseId: string,
    @Req() request: ClientPortalRequest,
  ): Promise<unknown> {
    return this.clientSessionLogsService.completeExercise(request.clientPortalAccess!, id, {
      sessionExerciseId,
    });
  }

  @UseGuards(ClientPortalAuthGuard)
  @Post(':token/session-logs/:id/exercises/:sessionExerciseId/use-alternative')
  useSessionExerciseAlternative(
    @Param('id') id: string,
    @Param('sessionExerciseId') sessionExerciseId: string,
    @Body() body: Pick<UseClientSessionAlternativeDto, 'alternativeId'>,
    @Req() request: ClientPortalRequest,
  ): Promise<unknown> {
    return this.clientSessionLogsService.useAlternative(request.clientPortalAccess!, id, {
      sessionExerciseId,
      alternativeId: body.alternativeId,
    });
  }

  @UseGuards(ClientPortalAuthGuard)
  @Post(':token/session-logs/:id/finalize')
  finalizeSessionLog(
    @Param('id') id: string,
    @Req() request: ClientPortalRequest,
  ): Promise<unknown> {
    return this.clientSessionLogsService.finalizeSession(request.clientPortalAccess!, id);
  }

  @UseGuards(ClientPortalAuthGuard)
  @Get(':token/session-logs/:id/completion-card')
  getCompletionCard(
    @Param('id') id: string,
    @Req() request: ClientPortalRequest,
  ) {
    return this.clientSessionLogsService.getCompletionCard(request.clientPortalAccess!, id);
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
