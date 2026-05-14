import { Injectable } from '@nestjs/common';

@Injectable()
export class OrganizationsService {
  getStatus() {
    return { module: 'organizations', status: 'ready' };
  }
}
