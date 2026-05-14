import { Injectable } from '@nestjs/common';

@Injectable()
export class ClientsService {
  getStatus() {
    return { module: 'clients', status: 'ready' };
  }
}
