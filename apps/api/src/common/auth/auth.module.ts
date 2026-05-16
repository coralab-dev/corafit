import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { OrganizationGuard } from './organization.guard';
import { PlatformAdminGuard } from './platform-admin.guard';
import { RoleGuard } from './role.guard';
import { SupabaseAuthService } from './supabase-auth.service';
import { SupabaseJwtGuard } from './supabase-jwt.guard';

@Global()
@Module({
  providers: [
    OrganizationGuard,
    PlatformAdminGuard,
    RoleGuard,
    SupabaseAuthService,
    {
      provide: APP_GUARD,
      useClass: SupabaseJwtGuard,
    },
  ],
  exports: [
    OrganizationGuard,
    PlatformAdminGuard,
    RoleGuard,
    SupabaseAuthService,
  ],
})
export class CommonAuthModule {}
