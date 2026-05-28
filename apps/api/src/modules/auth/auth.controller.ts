import { Body, Controller, Get, Patch, Post, Req } from '@nestjs/common';
import type { AuthenticatedRequest } from '../../common/auth/authenticated-request';
import { Public } from '../../common/auth/public.decorator';
import { AuthService, type RegisterProfileResult } from './auth.service';
import type { RegisterProfileDto } from './dto/register-profile.dto';
import type { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Get('status')
  getStatus() {
    return this.authService.getStatus();
  }

  @Public()
  @Get('me')
  getMe(@Req() request: AuthenticatedRequest) {
    return this.authService.getMe(request.headers.authorization);
  }

  @Public()
  @Post('register-profile')
  registerProfile(
    @Body() body: RegisterProfileDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<RegisterProfileResult> {
    return this.authService.registerProfile(body, request.headers.authorization);
  }

  @Patch('me')
  updateProfile(
    @Body() body: UpdateProfileDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.authService.updateProfile(request.user!.id, body);
  }
}
