import { Module } from '@nestjs/common';
import { ClientPortalAuthGuard } from './client-portal-auth.guard';
import { ClientPortalController } from './client-portal.controller';
import { ClientPortalService } from './client-portal.service';
import { ClientSessionSnapshotService } from './client-session-snapshot.service';

@Module({
  controllers: [ClientPortalController],
  providers: [ClientPortalAuthGuard, ClientPortalService, ClientSessionSnapshotService],
  exports: [ClientPortalAuthGuard, ClientPortalService, ClientSessionSnapshotService],
})
export class ClientPortalModule {}
