import { Injectable } from '@nestjs/common';

@Injectable()
export class DashboardService {
  getStatus() {
    return { module: 'dashboard', status: 'ready' };
  }
}
