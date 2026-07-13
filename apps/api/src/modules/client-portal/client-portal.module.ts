import { Module } from '@nestjs/common';
import { ClientPortalAuthGuard } from './client-portal-auth.guard';
import { ClientPortalController } from './client-portal.controller';
import { ClientPortalService } from './client-portal.service';
import { ClientSessionLogsService } from './client-session-logs.service';
import { ClientSessionSnapshotService } from './client-session-snapshot.service';
import { ClientStreakService } from './client-streak.service';
import { ProgressModule } from '../progress/progress.module';

@Module({
  imports: [ProgressModule],
  controllers: [ClientPortalController],
  providers: [
    ClientPortalAuthGuard,
    ClientPortalService,
    ClientSessionLogsService,
    ClientSessionSnapshotService,
    ClientStreakService,
  ],
  exports: [
    ClientPortalAuthGuard,
    ClientPortalService,
    ClientSessionLogsService,
    ClientSessionSnapshotService,
    ClientStreakService,
  ],
})
export class ClientPortalModule {}
