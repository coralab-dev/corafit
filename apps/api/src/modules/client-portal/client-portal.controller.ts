import { Controller, Get } from '@nestjs/common';
import { Public } from '../../common/auth/public.decorator';
import { ClientPortalService } from './client-portal.service';

@Public()
@Controller('client-portal')
export class ClientPortalController {
  constructor(private readonly clientPortalService: ClientPortalService) {}

  @Get('status')
  getStatus() {
    return this.clientPortalService.getStatus();
  }
}
