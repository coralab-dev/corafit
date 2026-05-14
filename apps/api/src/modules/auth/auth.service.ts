import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthService {
  getStatus() {
    return { module: 'auth', status: 'ready' };
  }
}
