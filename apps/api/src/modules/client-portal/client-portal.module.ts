import { Module } from '@nestjs/common';
import { ClientPortalAuthGuard } from './client-portal-auth.guard';
import { ClientPortalController } from './client-portal.controller';
import { ClientPortalService } from './client-portal.service';

@Module({
  controllers: [ClientPortalController],
  providers: [ClientPortalAuthGuard, ClientPortalService],
  exports: [ClientPortalAuthGuard, ClientPortalService],
})
export class ClientPortalModule {}
