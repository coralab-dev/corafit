import { Injectable } from '@nestjs/common';

@Injectable()
export class ExercisesService {
  getStatus() {
    return { module: 'exercises', status: 'ready' };
  }
}
