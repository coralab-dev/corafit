import { Injectable } from '@nestjs/common';

@Injectable()
export class AdminService {
  getStatus() {
    return { module: 'admin', status: 'ready' };
  }
}
