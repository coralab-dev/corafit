import { Controller, Get, Req } from '@nestjs/common';
import type { AuthenticatedRequest } from '../../common/auth/authenticated-request';
import { Public } from '../../common/auth/public.decorator';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Get('status')
  getStatus() {
    return this.authService.getStatus();
  }

  @Get('me')
  getMe(@Req() request: AuthenticatedRequest) {
    return this.authService.getMe(request.user);
  }
}
