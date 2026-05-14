import { Injectable } from '@nestjs/common';

@Injectable()
export class ProgressService {
  getStatus() {
    return { module: 'progress', status: 'ready' };
  }
}
