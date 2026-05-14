import { Injectable } from '@nestjs/common';

@Injectable()
export class BillingService {
  getStatus() {
    return { module: 'billing', status: 'ready' };
  }
}
