import { ConfigService } from '@nestjs/config';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import type { AppConfig } from '../../config/env.schema';

export function createSupabaseServiceClient<Database = never>(
  configService: ConfigService<AppConfig, true>,
): SupabaseClient<Database> {
  return createClient<Database>(
    configService.get('SUPABASE_URL', { infer: true }),
    configService.get('SUPABASE_SERVICE_KEY', { infer: true }),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      realtime: {
        transport: WebSocket as never,
      },
    },
  );
}
