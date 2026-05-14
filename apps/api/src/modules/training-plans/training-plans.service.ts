import { Injectable } from '@nestjs/common';

@Injectable()
export class TrainingPlansService {
  getStatus() {
    return { module: 'training-plans', status: 'ready' };
  }
}
