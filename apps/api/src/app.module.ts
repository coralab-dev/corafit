import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'node:path';
import { AdminModule } from './modules/admin/admin.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AuthModule } from './modules/auth/auth.module';
import { BillingModule } from './modules/billing/billing.module';
import { ClientPortalModule } from './modules/client-portal/client-portal.module';
import { ClientsModule } from './modules/clients/clients.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ExercisesModule } from './modules/exercises/exercises.module';
import { HealthModule } from './modules/health/health.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { ProgressModule } from './modules/progress/progress.module';
import { TrainingPlansModule } from './modules/training-plans/training-plans.module';
import { CommonAuthModule } from './common/auth/auth.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { validateEnv } from './config/env.schema';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        join(process.cwd(), '.env'),
        join(process.cwd(), '../../.env'),
      ],
      validate: validateEnv,
    }),
    PrismaModule,
    CommonAuthModule,
    HealthModule,
    AuthModule,
    OrganizationsModule,
    ClientsModule,
    ExercisesModule,
    TrainingPlansModule,
    ClientPortalModule,
    ProgressModule,
    DashboardModule,
    AdminModule,
    BillingModule,
    AnalyticsModule,
  ],
})
export class AppModule {}
