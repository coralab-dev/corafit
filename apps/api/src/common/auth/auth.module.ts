import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { OrganizationGuard } from './organization.guard';
import { RoleGuard } from './role.guard';
import { SupabaseAuthService } from './supabase-auth.service';
import { SupabaseJwtGuard } from './supabase-jwt.guard';

@Global()
@Module({
  providers: [
    OrganizationGuard,
    RoleGuard,
    SupabaseAuthService,
    {
      provide: APP_GUARD,
      useClass: SupabaseJwtGuard,
    },
  ],
  exports: [OrganizationGuard, RoleGuard, SupabaseAuthService],
})
export class CommonAuthModule {}
