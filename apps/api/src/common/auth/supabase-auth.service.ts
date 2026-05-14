import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import type { AppConfig } from '../../config/env.schema';

type SupabaseDatabase = {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

@Injectable()
export class SupabaseAuthService {
  private readonly client: SupabaseClient<SupabaseDatabase>;

  constructor(configService: ConfigService<AppConfig, true>) {
    this.client = createClient<SupabaseDatabase>(
      configService.get('SUPABASE_URL', { infer: true }),
      configService.get('SUPABASE_SERVICE_KEY', { infer: true }),
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
      },
    );
  }

  async getUserFromJwt(jwt: string): Promise<User> {
    const { data, error } = await this.client.auth.getUser(jwt);

    if (error || !data.user) {
      throw new UnauthorizedException('Invalid or expired access token');
    }

    return data.user;
  }
}
