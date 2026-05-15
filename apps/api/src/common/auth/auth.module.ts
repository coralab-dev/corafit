import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { SupabaseAuthService } from './supabase-auth.service';
import { SupabaseJwtGuard } from './supabase-jwt.guard';

@Global()
@Module({
  providers: [
    SupabaseAuthService,
    {
      provide: APP_GUARD,
      useClass: SupabaseJwtGuard,
    },
  ],
  exports: [SupabaseAuthService],
})
export class CommonAuthModule {}
