import { Injectable } from '@nestjs/common';

@Injectable()
export class ClientPortalService {
  getStatus() {
    return { module: 'client-portal', status: 'ready' };
  }
}
