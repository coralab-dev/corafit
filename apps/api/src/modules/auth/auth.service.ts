import { Injectable } from '@nestjs/common';
import type { User } from 'db';

@Injectable()
export class AuthService {
  getStatus() {
    return { module: 'auth', status: 'ready' };
  }

  getMe(user: User | undefined) {
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      supabaseUserId: user.supabaseUserId,
      email: user.email,
      name: user.name,
      phone: user.phone,
      platformRole: user.platformRole,
      status: user.status,
    };
  }
}
